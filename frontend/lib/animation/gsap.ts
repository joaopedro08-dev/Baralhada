import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { Physics2DPlugin } from "gsap/Physics2DPlugin"
import { SplitText } from "gsap/SplitText"

gsap.registerPlugin(useGSAP, MotionPathPlugin, Physics2DPlugin, SplitText)

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export { gsap, SplitText, useGSAP }
