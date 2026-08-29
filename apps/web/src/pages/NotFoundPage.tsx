import { PublicShell } from '../components/layout/PublicShell';
import { ButtonLink } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <PublicShell title="That page isn’t here">
      <p>The link is wrong, expired, or the session ended. Nothing else is implied.</p>
      <div className="max-w-[12rem]">
        <ButtonLink to="/">Go home</ButtonLink>
      </div>
    </PublicShell>
  );
}
