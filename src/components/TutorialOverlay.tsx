import { useState, useEffect } from 'react';
import styles from './TutorialOverlay.module.css';

interface Props {
  onComplete: () => void;
}

interface Card {
  title: string;
  text: string;
  icon: string;
}

const CARDS: Card[] = [
  {
    title: 'Dig and Collect',
    text: 'Break blocks to collect resources and discover deeper layers.',
    icon: '⛏️',
  },
  {
    title: 'Return and Sell',
    text: 'When your cargo is full, return to the surface and sell resources for money.',
    icon: '💰',
  },
  {
    title: 'Upgrade and Explore',
    text: 'Use money to improve your equipment and reach deeper areas.',
    icon: '🚀',
  },
];

export default function TutorialOverlay({ onComplete }: Props) {
  const [currentCard, setCurrentCard] = useState(0);

  const handleNext = () => {
    if (currentCard < CARDS.length - 1) {
      setCurrentCard(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentCard > 0) {
        setCurrentCard(prev => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard]);

  const card = CARDS[currentCard];

  return (
    <div className={styles.overlay} data-testid="tutorial-overlay">
      <div className={styles.panel}>
        <div className={styles.progress}>
          {CARDS.map((_, index) => (
            <div
              key={index}
              className={`${styles.dot} ${index === currentCard ? styles.activeDot : ''}`}
            />
          ))}
        </div>
        <div className={styles.icon}>{card.icon}</div>
        <h2 className={styles.title}>{card.title}</h2>
        <p className={styles.text}>{card.text}</p>
        <div className={styles.buttons}>
          <button className={styles.skipBtn} onClick={handleSkip}>
            Skip
          </button>
          <button className={styles.nextBtn} onClick={handleNext}>
            {currentCard === CARDS.length - 1 ? 'Done' : 'Next'}
          </button>
        </div>
        <div className={styles.keyboardHint}>
          [Space/Enter] Next &nbsp;&nbsp;&nbsp; [Esc] Skip
        </div>
      </div>
    </div>
  );
}
