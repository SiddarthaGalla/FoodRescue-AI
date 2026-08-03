import { Variants } from 'framer-motion';

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

export const cardHover: Variants = {
  initial: { y: 0, boxShadow: '0 8px 32px 0 rgba(22, 163, 74, 0.08)' },
  hover: { 
    y: -8, 
    boxShadow: '0 20px 40px 0 rgba(22, 163, 74, 0.2)',
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  }
};

export const buttonPress: Variants = {
  initial: { scale: 1 },
  tap: { scale: 0.95 },
  hover: { scale: 1.03 }
};

export const floatingAnimation = {
  y: [0, -12, 0],
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};
