import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'metro'
  className?: string
}

export default function Button({ 
  children, 
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 active:scale-95"
  
  const variants = {
    primary: "bg-[#001489] text-white hover:bg-[#0015a0] focus:ring-[#001489] shadow-lg hover:shadow-xl",
    secondary: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg hover:shadow-xl",
    metro: "bg-gradient-to-r from-[#001489] to-red-600 text-white hover:from-[#0015a0] hover:to-red-700 focus:ring-[#001489] shadow-lg hover:shadow-xl"
  }

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}