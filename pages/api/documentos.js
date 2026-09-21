import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Debes iniciar sesión." });
  }

  const client = await clientPromise;
  const db = client.db("gradomaster");
  const coleccion = db.collection("documentos");

  if (req.method === "GET") {
    const documentos = await coleccion
      .find({ userEmail: session.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      documentos: documentos.map((d) => ({
        ...d,
        id: d._id.toString(),
        _id: undefined,
      })),
    });
  }

  if (req.method === "POST") {
    const {
      materia,
      titulo,
      archivo,
      recursos,
      flashcards,
      preguntas_orales,
    } = req.body || {};

    const doc = {
      userEmail: session.user.email,
      materia: materia || "",
      titulo: titulo || "Documento sin título",
      archivo: archivo || null,
      recursos: Array.isArray(recursos) ? recursos : [],
      flashcards: Array.isArray(flashcards) ? flashcards : [],
      preguntas_orales: Array.isArray(preguntas_orales) ? preguntas_orales : [],
      fecha: new Date().toLocaleString("es-CL"),
      createdAt: new Date(),
    };

    const result = await coleccion.insertOne(doc);

    return res.status(200).json({
      ...doc,
      id: result.insertedId.toString(),
    });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Falta el id del documento." });
    }

    await coleccion.deleteOne({
      _id: new ObjectId(id),
      userEmail: session.user.email,
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método no permitido" });
}
