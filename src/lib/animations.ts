import { Variants, Transition } from 'framer-motion'

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export const fadeUpTransition: Transition = {
  duration: 0.7,
  ease: [0.25, 0.1, 0.25, 1],
}

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -2 },
  visible: { opacity: 1, scale: 1, rotate: 0 },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0 },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0 },
}

export const pulseKeyframes = {
  scale: [1, 1.04, 1],
  opacity: [0.8, 1, 0.8],
}
