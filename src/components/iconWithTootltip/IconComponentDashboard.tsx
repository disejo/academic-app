import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@mdi/react';
import { mdiMonitorDashboard } from '@mdi/js';
import styles from './css/Tooltip.module.css';

type Direction = 0 | 90 | 180 | -90;

interface Props {
  direction?: Direction;
  path?: string;
  tooltipText?: string;
}

const IconComponentDashboard = ({ direction = 0, path, tooltipText }: Props) => {
  const pathname = usePathname();
  const isActive = pathname === path;
  const [showTooltip, setShowTooltip] = useState(false);

  const getTooltipPosition = () => {
    switch (direction) {
      case 0:
        return 'bottom-full mb-2 left-1/2 -translate-x-1/2';
      case 90:
        return 'left-full ml-2 top-1/2 -translate-y-1/2';
      case 180:
        return 'top-full mt-2 left-1/2 -translate-x-1/2';
      case -90:
        return 'right-full mr-2 top-1/2 -translate-y-1/2';
      default:
        return 'bottom-full mb-2 left-1/2 -translate-x-1/2';
    }
  };

  const getArrowPosition = () => {
    switch (direction) {
      case 0:
        return 'top-full left-1/2 -translate-x-1/2';
      case 90:
        return 'right-full top-1/2 -translate-y-1/2';
      case 180:
        return 'bottom-full left-1/2 -translate-x-1/2';
      case -90:
        return 'left-full top-1/2 -translate-y-1/2';
      default:
        return 'top-full left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => setShowTooltip(false)}
        className="p-2 rounded-full cursor-pointer"
      >
        <Icon path={mdiMonitorDashboard} size={1} color={isActive ? 'white' : 'gray'} />
      </button>

      {showTooltip && (
        <div
          className={`${styles.fadeIn} absolute z-[9999] px-3 py-1 text-sm text-white bg-black rounded shadow-md ${getTooltipPosition()}`}
        >
          {tooltipText}
          <div
            className={`absolute w-2 h-2 bg-black rotate-45 ${getArrowPosition()}`}
          ></div>
        </div>
      )}
    </div>
  );
};

export default IconComponentDashboard;
