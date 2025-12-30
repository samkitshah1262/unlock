// LaTeX to Unicode Math Rendering Component

import React from 'react'
import { Text, StyleSheet, View } from 'react-native'

interface Props {
  latex: string
  color?: string
  fontSize?: number
  style?: object
}

// Convert common LaTeX to Unicode
function latexToUnicode(latex: string): string {
  let result = latex
    // Remove display delimiters
    .replace(/^\\\[/, '')
    .replace(/\\\]$/, '')
    .replace(/^\$\$/, '')
    .replace(/\$\$$/, '')
    .replace(/^\$/, '')
    .replace(/\$$/, '')
    .trim()

  // Greek letters
  const greekMap: Record<string, string> = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\varepsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η',
    '\\theta': 'θ', '\\vartheta': 'ϑ', '\\iota': 'ι', '\\kappa': 'κ',
    '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ',
    '\\pi': 'π', '\\varpi': 'ϖ', '\\rho': 'ρ', '\\varrho': 'ϱ',
    '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ', '\\upsilon': 'υ',
    '\\phi': 'φ', '\\varphi': 'ϕ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
    '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ',
    '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  }

  // Operators and symbols
  const symbolMap: Record<string, string> = {
    '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\pm': '±', '\\mp': '∓',
    '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
    '\\equiv': '≡', '\\sim': '∼', '\\propto': '∝',
    '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
    '\\sum': 'Σ', '\\prod': 'Π', '\\int': '∫',
    '\\sqrt': '√', '\\forall': '∀', '\\exists': '∃',
    '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
    '\\subseteq': '⊆', '\\supseteq': '⊇', '\\cup': '∪', '\\cap': '∩',
    '\\emptyset': '∅', '\\varnothing': '∅',
    '\\rightarrow': '→', '\\leftarrow': '←', '\\leftrightarrow': '↔',
    '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
    '\\to': '→', '\\gets': '←', '\\mapsto': '↦',
    '\\implies': '⟹', '\\iff': '⟺',
    '\\land': '∧', '\\lor': '∨', '\\lnot': '¬', '\\neg': '¬',
    '\\angle': '∠', '\\perp': '⊥', '\\parallel': '∥',
    '\\ldots': '…', '\\cdots': '⋯', '\\vdots': '⋮', '\\ddots': '⋱',
    '\\prime': '′', '\\circ': '∘', '\\bullet': '•',
    '\\star': '⋆', '\\dagger': '†', '\\ddagger': '‡',
    '\\oplus': '⊕', '\\otimes': '⊗', '\\odot': '⊙',
    '\\ell': 'ℓ', '\\hbar': 'ℏ', '\\Re': 'ℜ', '\\Im': 'ℑ',
    '\\aleph': 'ℵ',
    '\\mathbb{R}': 'ℝ', '\\mathbb{N}': 'ℕ', '\\mathbb{Z}': 'ℤ',
    '\\mathbb{Q}': 'ℚ', '\\mathbb{C}': 'ℂ',
    '\\quad': '  ', '\\qquad': '    ', '\\,': ' ', '\\;': ' ', '\\!': '',
    '\\text': '', '\\mathrm': '', '\\mathbf': '', '\\mathit': '',
    '\\left': '', '\\right': '', '\\big': '', '\\Big': '', '\\bigg': '', '\\Bigg': '',
  }

  // Apply Greek letters
  for (const [tex, uni] of Object.entries(greekMap)) {
    result = result.replace(new RegExp(tex.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g'), uni)
  }

  // Apply symbols
  for (const [tex, uni] of Object.entries(symbolMap)) {
    result = result.replace(new RegExp(tex.replace(/[\\{}]/g, '\\$&'), 'g'), uni)
  }

  // Handle fractions: \frac{a}{b} -> a/b
  result = result.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
  // Nested fractions (simple)
  result = result.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')

  // Handle superscripts: ^{...} or ^x
  result = result.replace(/\^{([^{}]+)}/g, (_, exp) => toSuperscript(exp))
  result = result.replace(/\^([0-9n])/g, (_, exp) => toSuperscript(exp))

  // Handle subscripts: _{...} or _x
  result = result.replace(/_{([^{}]+)}/g, (_, sub) => toSubscript(sub))
  result = result.replace(/_([0-9nijkm])/g, (_, sub) => toSubscript(sub))

  // Handle sqrt with argument
  result = result.replace(/√\{([^{}]+)\}/g, '√($1)')

  // Clean up remaining braces and commands
  result = result.replace(/\\[a-zA-Z]+/g, '') // Remove unknown commands
  result = result.replace(/[{}]/g, '') // Remove remaining braces
  result = result.replace(/\s+/g, ' ') // Normalize whitespace

  return result.trim()
}

function toSuperscript(text: string): string {
  const superMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ', 'T': 'ᵀ', 't': 'ᵗ',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
    'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ',
    'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
    's': 'ˢ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  }
  return text.split('').map(c => superMap[c] || c).join('')
}

function toSubscript(text: string): string {
  const subMap: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
    'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
    'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
    'v': 'ᵥ', 'x': 'ₓ',
  }
  return text.split('').map(c => subMap[c] || c).join('')
}

export default function MathText({ latex, color = '#A5B4FC', fontSize = 18, style }: Props) {
  // Handle undefined or empty latex
  if (!latex) {
    return null
  }

  const converted = latexToUnicode(latex)

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.mathText, { color, fontSize }]}>
        {converted}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mathText: {
    fontFamily: 'System',
    textAlign: 'center',
    lineHeight: 28,
  },
})
