import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyNotice } from '@/components/empty-notice';
import { HomeBackButton } from '@/components/home-back-button';
import { ProgressBar } from '@/components/progress-bar';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { deleteChallenge, extendChallenge, getChallenges } from '@/modules/challenges/api/challenges';
import { ChallengeForm, ChallengeFormValues, emptyChallengeForm } from '@/modules/challenges/components/challenge-form';
import {
  addDays,
  Challenge,
  CHALLENGE_STATUS_LABELS,
  challengeStatus,
  ChallengeStatus,
  ChallengeView,
  countChallengeViews,
  daysBetween,
  validateExtension,
} from '@/modules/challenges/utils/challenges';
import { getListMemberships, getLists, ListSummary } from '@/modules/lists/api/lists';
import { getDistinctGenres } from '@/modules/movies/api/movies';
import { DateField } from '@/modules/movies/components/date-field';
import { formatViewDate, toLocalDateString } from '@/modules/movies/utils/view-date';
import { getViewRecords } from '@/modules/stats/api/stats';
import { errorMessage, showAlert } from '@/utils/alert';

const MAX_DATE = '2099-12-31';

// En curso arriba; después lo que pide acción (vencidos) y al final lo cumplido.
const STATUS_ORDER: Record<ChallengeStatus, number> = { active: 0, expired: 1, completed: 2 };

const STATUS_COLORS: Record<ChallengeStatus, { text: string; background: string; border: string }> = {
  active: { text: '#D78CFF', background: 'rgba(185,77,255,0.12)', border: '#6B2C8F' },
  completed: { text: '#4ADE80', background: 'rgba(74,222,128,0.1)', border: '#166534' },
  expired: { text: '#F87171', background: 'rgba(248,113,113,0.1)', border: '#7F1D1D' },
};

type ChallengeProgress = { challenge: Challenge; count: number; status: ChallengeStatus };

function plural(count: number, one: string, many: string) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function statusDetail({ challenge, count, status }: ChallengeProgress, today: string): string {
  if (status === 'completed') return '¡Meta cumplida! 🎉';
  const missing = challenge.targetCount - count;
  if (status === 'expired') {
    return `Venció el ${formatViewDate(challenge.endsOn)} · faltaron ${plural(missing, 'película', 'películas')}`;
  }
  if (today < challenge.startsOn) return `Empieza en ${plural(daysBetween(today, challenge.startsOn), 'día', 'días')}`;
  const daysLeft = daysBetween(today, challenge.endsOn);
  const timeLeft = daysLeft === 0 ? 'Último día' : `Quedan ${plural(daysLeft, 'día', 'días')}`;
  return `${timeLeft} · faltan ${plural(missing, 'película', 'películas')}`;
}

function ChallengeCard({
  progress,
  today,
  filterLabel,
  onExtend,
  onCreateAnother,
  onDelete,
}: {
  progress: ChallengeProgress;
  today: string;
  filterLabel: string;
  onExtend: () => void;
  onCreateAnother: () => void;
  onDelete: () => void;
}) {
  const { challenge, count, status } = progress;
  const colors = STATUS_COLORS[status];
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <View style={[styles.statusPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{CHALLENGE_STATUS_LABELS[status]}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {formatViewDate(challenge.startsOn)} – {formatViewDate(challenge.endsOn)} · {filterLabel}
      </Text>

      <View style={styles.cardProgress}>
        <ProgressBar done={count} total={challenge.targetCount} label="Vistas" />
      </View>
      <Text style={styles.cardDetail}>{statusDetail(progress, today)}</Text>

      <View style={styles.cardActions}>
        {status === 'expired' && (
          <>
            <Pressable accessibilityRole="button" onPress={onExtend} style={[styles.actionButton, styles.actionPrimary]}>
              <Text style={[styles.actionText, styles.actionPrimaryText]}>Ampliar plazo</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onCreateAnother} style={styles.actionButton}>
              <Text style={styles.actionText}>Crear otro</Text>
            </Pressable>
          </>
        )}
        <View style={styles.actionSpacer} />
        {confirmingDelete ? (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmText}>¿Eliminar?</Text>
            <Pressable accessibilityRole="button" onPress={() => setConfirmingDelete(false)} hitSlop={8}>
              <Text style={styles.linkText}>No</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Sí, eliminar el reto" onPress={onDelete} hitSlop={8}>
              <Text style={[styles.linkText, styles.dangerText]}>Sí</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar el reto ${challenge.title}`}
            onPress={() => setConfirmingDelete(true)}
            hitSlop={8}>
            <Text style={styles.linkText}>Eliminar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function Challenges() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const today = toLocalDateString(new Date());

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [views, setViews] = useState<ChallengeView[]>([]);
  const [memberships, setMemberships] = useState<Map<number, number[]>>(new Map());
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<ChallengeFormValues>(emptyChallengeForm);
  const [extending, setExtending] = useState<Challenge | null>(null);
  const [newEndsOn, setNewEndsOn] = useState(today);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [savingExtension, setSavingExtension] = useState(false);

  const load = useCallback(
    async (isActive: () => boolean) => {
      if (!userId) return;
      const [challengeData, membershipData, listData, genreData] = await Promise.all([
        getChallenges(userId),
        getListMemberships(),
        getLists(userId),
        getDistinctGenres(userId),
      ]);
      // Una sola consulta de vistas cubre las fechas de todos los retos.
      const from = challengeData.reduce((min, c) => (c.startsOn < min ? c.startsOn : min), MAX_DATE);
      const to = challengeData.reduce((max, c) => (c.endsOn > max ? c.endsOn : max), '');
      const viewData = challengeData.length > 0 ? await getViewRecords(userId, { from, to }) : [];
      if (!isActive()) return;
      setChallenges(challengeData);
      setMemberships(membershipData);
      setLists(listData);
      setGenres(genreData);
      setViews(viewData);
    },
    [userId]
  );

  function reload() {
    load(() => true).catch((err) =>
      showAlert('No se pudieron cargar tus retos', errorMessage(err))
    );
  }

  // Se recarga al volver: pudo registrarse una vista en la ficha.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      load(() => active)
        .catch((err) => showAlert('No se pudieron cargar tus retos', errorMessage(err)))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [load])
  );

  const progress: ChallengeProgress[] = challenges
    .map((challenge) => {
      const count = countChallengeViews(challenge, views, memberships);
      return { challenge, count, status: challengeStatus(challenge, count, today) };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  function filterLabel(challenge: Challenge): string {
    const { genre, list_id: listId } = challenge.filter;
    if (genre != null) return `Solo ${genre}`;
    if (listId != null) {
      const list = lists.find((item) => item.id === listId);
      return list ? `Lista ${list.name}` : 'Lista eliminada';
    }
    return 'Todas las películas';
  }

  function openNewChallenge() {
    setFormInitial(emptyChallengeForm());
    setFormOpen(true);
  }

  // Mismo reto, con un plazo igual de largo que empieza hoy.
  function openAnother(challenge: Challenge) {
    setFormInitial({
      title: challenge.title,
      target: String(challenge.targetCount),
      startsOn: today,
      endsOn: addDays(today, daysBetween(challenge.startsOn, challenge.endsOn)),
      filter: challenge.filter,
    });
    setFormOpen(true);
  }

  function openExtend(challenge: Challenge) {
    setExtending(challenge);
    setNewEndsOn(addDays(today > challenge.endsOn ? today : challenge.endsOn, 7));
    setExtendError(null);
  }

  async function handleExtend() {
    if (!extending) return;
    const message = validateExtension(extending, newEndsOn, today);
    if (message) {
      setExtendError(message);
      return;
    }
    setSavingExtension(true);
    const { error } = await extendChallenge(extending.id, newEndsOn);
    setSavingExtension(false);
    if (error) {
      setExtendError(`No se pudo ampliar el plazo: ${error.message}`);
      return;
    }
    setExtending(null);
    reload();
  }

  async function handleDelete(challengeId: number) {
    const { error } = await deleteChallenge(challengeId);
    if (error) {
      showAlert('No se pudo eliminar el reto', error.message);
      return;
    }
    setChallenges((current) => current.filter((item) => item.id !== challengeId));
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <HomeBackButton />
        <View style={styles.headerText}>
          <Text style={styles.title}>Retos</Text>
          <Text style={styles.count}>{plural(challenges.length, 'reto', 'retos')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Crear reto" onPress={openNewChallenge} style={styles.newButton}>
          <Text style={styles.newButtonText}>+ Nuevo</Text>
        </Pressable>
      </View>

      <FlatList
        data={progress}
        keyExtractor={(item) => String(item.challenge.id)}
        renderItem={({ item }) => (
          <ChallengeCard
            progress={item}
            today={today}
            filterLabel={filterLabel(item.challenge)}
            onExtend={() => openExtend(item.challenge)}
            onCreateAnother={() => openAnother(item.challenge)}
            onDelete={() => handleDelete(item.challenge.id)}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyNotice
            title="Todavía no tienes retos"
            copy="Ponte una meta, como “5 películas en octubre”, y sigue tu avance con cada vista que registres."
            actionLabel="Crear reto"
            onAction={openNewChallenge}
          />
        }
      />

      {userId && formOpen && (
        <ChallengeForm
          userId={userId}
          initial={formInitial}
          genres={genres}
          lists={lists}
          onClose={() => setFormOpen(false)}
          onCreated={() => {
            setFormOpen(false);
            reload();
          }}
        />
      )}

      <Modal
        transparent
        statusBarTranslucent
        animationType="fade"
        visible={extending != null}
        onRequestClose={() => {
          if (!savingExtension) setExtending(null);
        }}>
        <Pressable
          accessibilityLabel="Cerrar"
          disabled={savingExtension}
          onPress={() => setExtending(null)}
          style={styles.backdrop}
        />
        {extending && (
          <View style={[styles.dialog, { top: insets.top + 110 }]}>
            <Text style={styles.dialogTitle}>Ampliar plazo</Text>
            <Text style={styles.dialogCopy}>
              “{extending.title}” terminaba el {formatViewDate(extending.endsOn)}. Elige la nueva fecha de término.
            </Text>
            <View style={styles.dialogField}>
              <DateField
                label="Nuevo término del reto"
                value={newEndsOn}
                max={MAX_DATE}
                onChange={(value) => {
                  setNewEndsOn(value);
                  setExtendError(null);
                }}
              />
            </View>
            {extendError && (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {extendError}
              </Text>
            )}
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                disabled={savingExtension}
                onPress={() => setExtending(null)}
                style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={savingExtension}
                onPress={handleExtend}
                style={[styles.dialogButton, styles.dialogButtonPrimary]}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonPrimaryText]}>
                  {savingExtension ? 'Guardando…' : 'Ampliar'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  loadingScreen: { flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerText: { flex: 1 },
  title: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  count: { color: '#7D7382', fontSize: 12, marginTop: 2 },
  newButton: { height: 38, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#A83BDD', alignItems: 'center', justifyContent: 'center' },
  newButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4 },
  separator: { height: 14 },
  card: { padding: 16, borderRadius: 18, backgroundColor: '#15131A', borderWidth: 1, borderColor: '#27222D' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, color: '#F4F4F5', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  statusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800' },
  cardMeta: { color: '#81788A', fontSize: 12, marginTop: 6 },
  cardProgress: { marginTop: 14 },
  cardDetail: { color: '#A1A1AA', fontSize: 12, marginTop: 8 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  actionSpacer: { flex: 1 },
  actionButton: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#292431' },
  actionText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  actionPrimary: { backgroundColor: '#A83BDD', borderColor: '#A83BDD' },
  actionPrimaryText: { color: '#FFFFFF' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  confirmText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
  linkText: { color: '#7D7382', fontSize: 12, fontWeight: '700' },
  dangerText: { color: '#F87171' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  dialog: { position: 'absolute', left: 24, right: 24, padding: 18, borderRadius: 18, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431' },
  dialogTitle: { color: '#F4F4F5', fontSize: 17, fontWeight: '800' },
  dialogCopy: { color: '#A1A1AA', fontSize: 13, lineHeight: 19, marginTop: 8 },
  dialogField: { marginTop: 14 },
  errorText: { color: '#F87171', fontSize: 13, fontWeight: '600', marginTop: 12 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  dialogButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#292431' },
  dialogButtonText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  dialogButtonPrimary: { backgroundColor: '#A83BDD', borderColor: '#A83BDD' },
  dialogButtonPrimaryText: { color: '#FFFFFF' },
});
