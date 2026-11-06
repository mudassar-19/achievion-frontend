import LoginForm from "@/components/widgets/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-text-primary">
          Welcome back to the Arena
        </h2>
        <p className="text-sm text-text-secondary">
          Sign in to continue your journey.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
