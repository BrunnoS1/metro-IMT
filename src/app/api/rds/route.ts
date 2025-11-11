import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// RDS configuration
const rdsConfig = {
  host: process.env.AWS_RDS_HOST,
  user: process.env.AWS_RDS_USER,
  password: process.env.AWS_RDS_PASSWORD,
  database: process.env.AWS_RDS_DATABASE,
  port: Number(process.env.AWS_RDS_PORT) || 3306,
  ssl: process.env.AWS_RDS_SSL === 'true' ? {
    rejectUnauthorized: false,
  } : undefined,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const id = url.searchParams.get('id');

    // Validate RDS configuration
    if (!rdsConfig.host || !rdsConfig.user || !rdsConfig.password || !rdsConfig.database) {
      console.error('RDS Config:', {
        host: !!rdsConfig.host,
        user: !!rdsConfig.user,
        password: !!rdsConfig.password,
        database: !!rdsConfig.database,
      });
      return NextResponse.json(
        { error: 'Configuração do RDS incompleta. Verifique as variáveis de ambiente.' },
        { status: 500 }
      );
    }

    let connection;

    try {
      console.log('Tentando conectar ao RDS:', {
        host: rdsConfig.host,
        database: rdsConfig.database,
        port: rdsConfig.port,
      });
      
      connection = await mysql.createConnection(rdsConfig);
      console.log('Conexão estabelecida com sucesso');

      // Get all worksites
      if (action === 'getWorksites') {
        const [rows] = await connection.execute('SELECT id, nome, descricao FROM projetos ORDER BY nome');
        console.log('Query executada com sucesso, rows:', rows);
        return NextResponse.json(rows);
      }

      // Get single worksite
      if (action === 'getWorksite' && id) {
        const [rows] = await connection.execute('SELECT id, nome, descricao FROM projetos WHERE id = ?', [id]);
        
        if (Array.isArray(rows) && rows.length > 0) {
          return NextResponse.json(rows[0]);
        }
        
        return NextResponse.json({ error: 'Obra não encontrada.' }, { status: 404 });
      }

      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    } catch (error) {
      console.error('Erro detalhado ao conectar ao RDS:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any).code,
        errno: (error as any).errno,
        sqlState: (error as any).sqlState,
      });
      
      return NextResponse.json(
        { 
          error: 'Não foi possível conectar ao banco de dados.',
          details: error instanceof Error ? error.message : 'Unknown error',
          hint: 'Verifique se o RDS está acessível publicamente e se o security group permite conexões na porta 3306'
        },
        { status: 500 }
      );
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch (e) {
          console.error('Erro ao fechar conexão:', e);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { nome, descricao } = await req.json();

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório.' },
        { status: 400 }
      );
    }

    if (!rdsConfig.host || !rdsConfig.user || !rdsConfig.password || !rdsConfig.database) {
      return NextResponse.json(
        { error: 'Configuração do RDS incompleta.' },
        { status: 500 }
      );
    }

    let connection;

    try {
      connection = await mysql.createConnection(rdsConfig);
      await connection.execute(
        'INSERT INTO projetos (nome, descricao) VALUES (?, ?)',
        [nome, descricao || null]
      );

      return NextResponse.json({ message: 'Obra adicionada com sucesso!' });
    } catch (error) {
      console.error('Erro ao adicionar obra:', error);
      return NextResponse.json(
        { error: 'Erro ao adicionar obra.', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    } finally {
      if (connection) await connection.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao processar requisição.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { id, nome, descricao } = await req.json();

    if (!id || !nome) {
      return NextResponse.json(
        { error: 'ID e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!rdsConfig.host || !rdsConfig.user || !rdsConfig.password || !rdsConfig.database) {
      return NextResponse.json(
        { error: 'Configuração do RDS incompleta.' },
        { status: 500 }
      );
    }

    let connection;

    try {
      connection = await mysql.createConnection(rdsConfig);
      await connection.execute(
        'UPDATE projetos SET nome = ?, descricao = ? WHERE id = ?',
        [nome, descricao || null, id]
      );

      return NextResponse.json({ message: 'Obra atualizada com sucesso!' });
    } catch (error) {
      console.error('Erro ao atualizar obra:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar obra.', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    } finally {
      if (connection) await connection.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao processar requisição.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório.' },
        { status: 400 }
      );
    }

    if (!rdsConfig.host || !rdsConfig.user || !rdsConfig.password || !rdsConfig.database) {
      return NextResponse.json(
        { error: 'Configuração do RDS incompleta.' },
        { status: 500 }
      );
    }

    let connection;

    try {
      connection = await mysql.createConnection(rdsConfig);
      await connection.execute('DELETE FROM projetos WHERE id = ?', [id]);

      return NextResponse.json({ message: 'Obra apagada com sucesso!' });
    } catch (error) {
      console.error('Erro ao apagar obra:', error);
      return NextResponse.json(
        { error: 'Erro ao apagar obra.', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    } finally {
      if (connection) await connection.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao processar requisição.' },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'nodejs',
};
