import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Authentication Error</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          Something went wrong while signing you in. Please try again.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block rounded-md bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black hover:opacity-90"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
