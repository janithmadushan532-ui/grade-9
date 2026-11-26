import {
  Coins,
  Flame,
  Magnet,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { PowerUpType } from '../game/types';

interface PowerUpIconProps {
  type: PowerUpType;
  className?: string;
}

export function PowerUpIcon({ type, className = 'w-5 h-5' }: PowerUpIconProps) {
  switch (type) {
    case 'magnet':
      return <Magnet className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'jetpack':
      return <Flame className={className} />;
    case 'speed':
      return <Zap className={className} />;
    case 'hoverboard':
      return <Sparkles className={className} />;
    case 'doubleCoins':
      return <Coins className={className} />;
  }
}
