import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import mysql from 'mysql2/promise';

AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
});

const s3 = new AWS.S3();
const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

const rdsConfig = {
  host: process.env.AWS_RDS_HOST,
  user: process.env.AWS_RDS_USER,
  password: process.env.AWS_RDS_PASSWORD,
  database: process.env.AWS_RDS_DATABASE,
  port: Number(process.env.AWS_RDS_PORT) || 3306,
  ssl: process.env.AWS_RDS_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

export async function POST(req: Request) {
  try {
    const { foto_id, worksite, pontos2d } = await req.json();

    if (!foto_id || !worksite || !pontos2d) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
    }

    const jsonString = JSON.stringify(pontos2d);
    const s3Key = `obras/${worksite}/fotos/${foto_id}/pontos2d.json`;

    await s3
      .upload({
        Bucket: bucketName!,
        Key: s3Key,
        Body: jsonString,
        ContentType: 'application/json',
      })
      .promise();

    const connection = await mysql.createConnection(rdsConfig);
    await connection.execute(
      `INSERT INTO foto_pontos_2d (foto_id, s3_key) VALUES (?, ?)`,
      [foto_id, s3Key]
    );
    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Pontos 2D salvos no S3 e RDS',
      s3_key: s3Key,
      quantidade: pontos2d.length,
    });
  } catch (error: any) {
    console.error('Erro ao salvar pontos 2D:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar pontos 2D', details: error.message },
      { status: 500 }
    );
  }
}
