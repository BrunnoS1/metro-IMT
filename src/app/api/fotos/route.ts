import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

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

export async function POST(req: Request) {
  let connection: mysql.Connection | undefined;

  try {
    const { worksite, nome_arquivo, url_s3, descricao } = await req.json();

    if (!worksite || typeof worksite !== 'string') {
      return NextResponse.json(
        { error: 'Worksite é obrigatório.' },
        { status: 400 }
      );
    }

    if (!nome_arquivo || typeof nome_arquivo !== 'string') {
      return NextResponse.json(
        { error: 'Nome do arquivo é obrigatório.' },
        { status: 400 }
      );
    }

    if (!url_s3 || typeof url_s3 !== 'string') {
      return NextResponse.json(
        { error: 'URL do arquivo S3 (url_s3) é obrigatória.' },
        { status: 400 }
      );
    }

    if (!descricao || descricao.trim().length === 0 || descricao.length > 1000) {
      return NextResponse.json(
        { error: 'Descrição deve ter entre 1 e 1000 caracteres.' },
        { status: 400 }
      );
    }

    connection = await mysql.createConnection(rdsConfig);

    // 1) Buscar projeto_id pelo nome da obra
    const [projetosRows] = await connection.execute(
      'SELECT id FROM projetos WHERE nome = ? LIMIT 1',
      [worksite]
    );

    const projetos = projetosRows as Array<{ id: number }>;

    if (projetos.length === 0) {
      return NextResponse.json(
        { error: `Projeto "${worksite}" não encontrado na tabela projetos.` },
        { status: 400 }
      );
    }

    const projeto_id = projetos[0].id;

    // 2) Ver se já existe foto com esse nome + projeto
    const [fotosRows] = await connection.execute(
      `SELECT id FROM fotos 
       WHERE nome_arquivo = ? AND projeto_id = ? 
       LIMIT 1`,
      [nome_arquivo, projeto_id]
    );

    const fotos = fotosRows as Array<{ id: number }>;

    let foto_id: number;

    if (fotos.length > 0) {
      // 3a) Atualiza foto existente
      foto_id = fotos[0].id;

      const [updateResult]: any = await connection.execute(
        `UPDATE fotos
         SET descricao = ?, url_s3 = ?
         WHERE id = ?`,
        [descricao, url_s3, foto_id]
      );

      return NextResponse.json({
        message: 'Descrição atualizada com sucesso!',
        foto_id,
        projeto_id,
        updated: true,
      });

    } else {
      // 3b) Insere nova foto
      const [insertResult]: any = await connection.execute(
        `INSERT INTO fotos (projeto_id, nome_arquivo, url_s3, descricao)
         VALUES (?, ?, ?, ?)`,
        [projeto_id, nome_arquivo, url_s3, descricao]
      );

      foto_id = insertResult.insertId;

      return NextResponse.json({
        message: 'Descrição salva com sucesso!',
        foto_id,
        projeto_id,
        created: true,
      });
    }

  } catch (error) {
    console.error('Erro ao salvar descrição:', error);
    return NextResponse.json(
      {
        error: 'Erro ao salvar descrição.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

export async function GET(req: Request) {
  let connection: mysql.Connection | undefined;

  try {
    const url = new URL(req.url);
    const worksite = url.searchParams.get('worksite');

    if (!worksite) {
      return NextResponse.json(
        { error: 'Worksite é obrigatório.' },
        { status: 400 }
      );
    }

    connection = await mysql.createConnection(rdsConfig);

    // Opcionalmente poderíamos filtrar por projeto_id,
    // mas sua lógica atual por url_s3 já funciona bem.
    const [rows] = await connection.execute(
      `SELECT id as foto_id, url_s3, descricao 
       FROM fotos 
       WHERE url_s3 LIKE CONCAT('%/obras/', ?, '/fotos/%')`,
      [worksite]
    );

    return NextResponse.json(rows);

  } catch (error) {
    console.error('Erro ao buscar descrições:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar descrições.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.end();
  }
}

export const config = {
  runtime: 'nodejs',
};
