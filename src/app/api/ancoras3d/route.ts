import { NextResponse } from "next/server";
import AWS from "aws-sdk";

AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
});

const s3 = new AWS.S3();
const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

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

    const key = getKey(worksite, fotoId);
    await s3
      .upload({
        Bucket: bucketName!,
        Key: key,
        Body: JSON.stringify(anchors3d, null, 2),
        ContentType: "application/json",
      })
      .promise();

    return NextResponse.json({ success: true, key, quantidade: anchors3d.length });
  } catch (error: any) {
    console.error("Erro ao salvar âncoras 3D:", error);
    return NextResponse.json({ error: "Erro ao salvar âncoras 3D." }, { status: 500 });
  }
}

export const config = {
  runtime: "nodejs",
};
