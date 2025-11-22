import { NextResponse } from "next/server";
import AWS from "aws-sdk";
import mysql from "mysql2/promise";

// === CONFIG RDS (mesmo padrão do /api/fotos e /api/rds) ===
const rdsConfig = {
  host: process.env.AWS_RDS_HOST,
  user: process.env.AWS_RDS_USER,
  password: process.env.AWS_RDS_PASSWORD,
  database: process.env.AWS_RDS_DATABASE,
  port: Number(process.env.AWS_RDS_PORT) || 3306,
  ssl: process.env.AWS_RDS_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

// === CONFIG S3 (mesmo padrão do /api/s3) ===
AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
});

const s3 = new AWS.S3();
const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

export async function POST(req: Request) {
  try {
    const { worksite, points } = await req.json();

    if (!worksite || !Array.isArray(points)) {
      return NextResponse.json(
        { error: "worksite e points (array) são obrigatórios." },
        { status: 400 }
      );
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: "Bucket S3 não configurado." },
        { status: 500 }
      );
    }

    if (!rdsConfig.host || !rdsConfig.user || !rdsConfig.password || !rdsConfig.database) {
      return NextResponse.json(
        { error: "Configuração do RDS incompleta." },
        { status: 500 }
      );
    }

    // 1) Descobrir o projeto_id pelo nome da obra
    const conn = await mysql.createConnection(rdsConfig);

    const [rows] = await conn.execute(
      "SELECT id FROM projetos WHERE nome = ? LIMIT 1",
      [worksite]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await conn.end();
      return NextResponse.json(
        { error: "Projeto não encontrado na tabela projetos." },
        { status: 400 }
      );
    }

    const projetoId = (rows as any)[0].id as number;

    // 2) Salvar JSON no S3
    const key = `obras/${worksite}/modeloBIM/bim_points.json`;

    await s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(points, null, 2),
        ContentType: "application/json",
      })
      .promise();

    // 3) Registrar no RDS
    await conn.execute(
      "INSERT INTO bim_points (projeto_id, s3_key, qtde_pontos) VALUES (?, ?, ?)",
      [projetoId, key, points.length]
    );

    await conn.end();

    return NextResponse.json({
      success: true,
      projeto_id: projetoId,
      s3_key: key,
      qtde_pontos: points.length,
    });
  } catch (error) {
    console.error("Erro ao salvar pontos 3D:", error);
    return NextResponse.json(
      { error: "Erro ao salvar pontos 3D." },
      { status: 500 }
    );
  }
}

export const config = {
  runtime: "nodejs",
};
