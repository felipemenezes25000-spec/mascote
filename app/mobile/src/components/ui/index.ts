/**
 * Barrel pra primitives UI.
 * Importe de `@/components/ui` em telas/features.
 */
export { Typography } from './Typography';
export { Input } from './Input';
export { Badge } from './Badge';
export { Chip } from './Chip';
export { Tag } from './Tag';
export { Avatar } from './Avatar';
export { Divider } from './Divider';
export { ListItem } from './ListItem';
export { ProgressBar } from './ProgressBar';
export { ProgressRing } from './ProgressRing';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';
export { ModalShell, BottomSheet } from './ModalShell';
export { ConfirmDialog } from './ConfirmDialog';
export { RewardToast } from './RewardToast';
export { StatPill } from './StatPill';
export { WalletMini } from './WalletMini';
export { MemoryCard, type MemoryCardData } from './MemoryCard';
export { PaywallCard } from './PaywallCard';
export { AccessibilityButton } from './AccessibilityButton';
export { MascotStatusBubble } from './MascotStatusBubble';
export { PrimaryActionCard } from './PrimaryActionCard';
export { QuickActionCard } from './QuickActionCard';
export { QuestCard } from './QuestCard';
export { EvolutionRevealModal } from './EvolutionRevealModal';
// EmptyState reusa o existente (já implementado).
export { EmptyState } from '@/components/EmptyState';

// --- Living Identity Design — primitives orgânicos do mascote-centered design.
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';
export { LivingCard, type LivingCardProps, type LivingCardTone } from './LivingCard';
export { ProgressPulse, type ProgressPulseProps } from './ProgressPulse';
export { CreatureHero, type CreatureHeroProps } from './CreatureHero';
export {
  CreatureReactionToast,
  type CreatureReactionToastProps,
  type ReactionKind,
} from './CreatureReactionToast';
