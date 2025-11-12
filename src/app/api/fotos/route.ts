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
  try {
    const { nome_arquivo, url_s3, descricao } = await req.json();

    if (!nome_arquivo) {
      return NextResponse.json(
        { error: 'Nome do arquivo é obrigatório.' },
        { status: 400 }
      );
    }

    if (!descricao || descricao.trim().length === 0 || descricao.length > 1000) {
      return NextResponse.json(
        { error: 'Descrição deve ter entre 1 e 1000 caracteres.' },
        { status: 400 }
      );
    }

    if (!url_s3 || typeof url_s3 !== 'string') {
      return NextResponse.json(
        { error: 'URL do arquivo S3 (url_s3) é obrigatória.' },
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
      // Tenta atualizar pela chave do nome do arquivo
      const [updateResult]: any = await connection.execute(
        `UPDATE fotos
         SET descricao = ?, url_s3 = ?
         WHERE nome_arquivo = ?`,
        [descricao, url_s3, nome_arquivo]
      );

      if (updateResult.affectedRows && updateResult.affectedRows > 0) {
        return NextResponse.json({ message: 'Descrição atualizada com sucesso!' });
      }

      // Se não atualizou nenhuma linha, insere um novo registro
      await connection.execute(
        `INSERT INTO fotos (nome_arquivo, url_s3, descricao)
         VALUES (?, ?, ?)`,
        [nome_arquivo, url_s3, descricao]
      );

      return NextResponse.json({ message: 'Descrição salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar descrição:', error);
      return NextResponse.json(
        { error: 'Erro ao salvar descrição.', details: error instanceof Error ? error.message : 'Unknown error' },
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const worksite = url.searchParams.get('worksite');

    if (!worksite) {
      return NextResponse.json(
        { error: 'Worksite é obrigatório.' },
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
      
      // Get all photo descriptions for this worksite by matching exact URLs
      const [rows] = await connection.execute(
        `SELECT url_s3, descricao 
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
