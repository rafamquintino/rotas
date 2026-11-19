'use client';
import { EnviarFoto } from '@/components/EnviarFoto';
import { registrarFoto } from '../actions';

export function FotoChopeira({ id }: { id: string }) {
  return <EnviarFoto pasta={`chopeiras/${id}`} onEnviada={(c) => registrarFoto(id, c)} />;
}
