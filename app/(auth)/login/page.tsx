import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, InputHint } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n';

import { requestMagicLink } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Écran de connexion. Un champ, un bouton.
 *
 * Il n'existe pas d'écran d'inscription : une adresse inconnue et une adresse
 * connue suivent exactement le même chemin et reçoivent le même message.
 *
 * L'état d'après-envoi passe par l'URL plutôt que par de l'état client : un
 * formulaire à un champ n'a pas besoin de JavaScript, et un rechargement de
 * page ne doit pas renvoyer d'e-mail.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const user = await getUser();
  if (user) redirect('/projects');

  const t = getDictionary();
  const { sent, error } = await searchParams;

  const message =
    error === 'expired'
      ? t.auth.linkExpired
      : error === 'invalid'
        ? t.auth.invalidEmail
        : error === 'failed'
          ? t.auth.failed
          : null;

  return (
    <main className="mx-auto flex max-w-onboarding flex-col items-center px-28 pt-90 pb-90">
      <Card className="w-full max-w-bubble">
        <CardHeader>
          <CardTitle>{t.auth.title}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-20">
          <p className="text-body text-ink-2">{t.auth.lead}</p>

          {sent ? (
            <p className="rounded-sub border border-ok bg-ok-soft px-16 py-14 text-body text-ok">
              {t.auth.sent}
            </p>
          ) : (
            <form action={requestMagicLink} className="flex flex-col gap-18">
              <Field>
                <Label htmlFor="email">{t.auth.emailLabel}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t.auth.emailPlaceholder}
                  aria-invalid={message ? true : undefined}
                />
                {message && <InputHint className="text-alert">{message}</InputHint>}
              </Field>

              <Button type="submit" size="block">
                {t.auth.submit}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
