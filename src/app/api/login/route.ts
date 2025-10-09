import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Chave secreta para JWT
const JWT_SECRET = 'metro_sp_secret_2024'

// Usuários simples sem hash de senha
const users = [
  {
    id: 1,
    email: 'admin@metro.sp.gov.br',
    password: '123456', // Senha em texto puro para simplificar
    name: 'Administrador Metro SP'
  },
  {
    id: 2,
    email: 'usuario@metro.sp.gov.br',
    password: 'metro123',
    name: 'Usuário Metro SP'
  }
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('Tentativa de login:', { email, password }) // Debug

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Encontra o usuário
    const user = users.find(u => u.email === email && u.password === password)
    
    console.log('Usuário encontrado:', user) // Debug
    
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Gera token JWT simples
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}