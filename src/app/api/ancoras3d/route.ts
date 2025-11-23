import { NextResponse } from "next/server";
import AWS from "aws-sdk";
import mysql from "mysql2/promise";

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
  ssl: process.env.AWS_RDS_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

function getKey(worksite: string, fotoId: number) {
  return `obras/${worksite}/fotos/${fotoId}/anchors3d.json`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const worksite = url.searchParams.get("worksite");
    const fotoIdParam = url.searchParams.get("fotoId");

    if (!worksite || !fotoIdParam) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const fotoId = Number(fotoIdParam);
    const key = getKey(worksite, fotoId);

    const data = await s3
      .getObject({
        Bucket: bucketName!,
        Key: key,
      })
      .promise();

    const anchors3d = JSON.parse(data.Body!.toString("utf-8"));

    return NextResponse.json({ anchors3d });
  } catch (error: any) {
    if (error?.code === "NoSuchKey") {
      return NextResponse.json({ anchors3d: [] }, { status: 200 });
    }

    console.error("Erro ao carregar âncoras 3D:", error);
    return NextResponse.json({ error: "Erro ao carregar âncoras 3D." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { worksite, fotoId, anchors3d } = body || {};

    if (!worksite || typeof fotoId !== "number" || !Array.isArray(anchors3d)) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    if (!bucketName) {
      return NextResponse.json({ error: "Bucket S3 não configurado." }, { status: 500 });
    }

    const key = getKey(worksite, fotoId);
    await s3
      .upload({
        Bucket: bucketName!,
        Key: key,
        Body: JSON.stringify(anchors3d, null, 2),
        ContentType: "application/json",
      })
      .promise();

    // Persist metadata in RDS table anchors_3d
    try {
      const conn = await mysql.createConnection(rdsConfig);
      await conn.execute(
        "INSERT INTO anchors_3d (photo_id, file_path) VALUES (?, ?)",
        [String(fotoId), key]
      );
      await conn.end();
    } catch (dbErr) {
      console.error("Erro ao registrar anchors_3d no RDS:", dbErr);
      // Continue even if DB insert fails; S3 upload already succeeded
    }

    return NextResponse.json({ success: true, key, quantidade: anchors3d.length });
  } catch (error: any) {
    console.error("Erro ao salvar âncoras 3D:", error);
    return NextResponse.json({ error: "Erro ao salvar âncoras 3D." }, { status: 500 });
  }
}

export const config = {
  runtime: "nodejs",
};
