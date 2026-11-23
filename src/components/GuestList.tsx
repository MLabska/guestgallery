import { StyleSheet, Text, View } from 'react-native';

import { formatJoinedAt, guestCount, guestCountLabel, roleLabel } from '../lib/participants';
import type { Participant } from '../lib/participants';
import { colors, spacing, typography } from '../theme';
import { ListGroup, ListRow } from './ListRow';
import { SectionHeader } from './Typography';

/** Who joined (SPEC 1.5): guest count, then every participant with the join time, host first. */
export function GuestList({ participants, hostId }: { participants: Participant[]; hostId: string }) {
  return (
    <View style={styles.box}>
      <SectionHeader>Who joined</SectionHeader>
      <Text style={styles.count}>{guestCountLabel(guestCount(participants, hostId))}</Text>
      <ListGroup>
        {participants.map((p, i) => (
          <ListRow
            key={p.user_id}
            title={p.nickname}
            subtitle={`Joined ${formatJoinedAt(p.joined_at)}`}
            detail={roleLabel(p, hostId) ?? undefined}
            last={i === participants.length - 1}
          />
        ))}
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', gap: spacing.xs },
  count: { ...typography.body, color: colors.secondaryText, marginBottom: spacing.xs },
});
