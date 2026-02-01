// src/features/auth/login/index.tsx
import { useState } from 'react';
import Button from '@/components/button';
import Input from '@/components/input';
import { useAuthStore } from '@/store/authStore';

const Login = () => {
  const { login, error, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="min-h-screen flex items-center focus:ring-0 justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-lg shadow-md focus:ring-0 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-primary mb-6">
          Login
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <Input
            label="Password"
            type="password"
            className="mb-6"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" fullWidth isLoading={loading}>
            Login
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
