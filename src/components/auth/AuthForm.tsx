
"use client";

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

interface AuthFormProps {
  isSignUp?: boolean;
  onSubmit: (values: FormValues) => Promise<void>;
  loading: boolean; // This is the loading prop from the page (specific to email/password)
}

// Google Icon SVG
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px" className="mr-2">
    <path fill="#EA4335" d="M24 9.5c3.96 0 6.42 1.66 7.88 2.97l5.5-5.5C34.54 4.26 30.02 2 24 2 14.53 2 6.81 7.98 4.13 16.01l6.62 5.12C12.16 14.44 17.59 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.12 24.01c0-1.65-.15-3.3-.43-4.88H24v9.19h12.42c-.54 2.97-2.05 5.48-4.46 7.22l6.62 5.12C42.01 37.24 46.12 31.25 46.12 24.01z"/>
    <path fill="#FBBC05" d="M10.75 28.01c-.43-1.29-.68-2.65-.68-4.01s.24-2.72.68-4.01L4.13 14.88C2.97 17.48 2.25 20.51 2.25 24c0 3.49.72 6.52 1.88 9.12l6.62-5.11z"/>
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.95 14.56-5.3l-6.62-5.12c-1.97 1.32-4.49 2.11-7.94 2.11-6.41 0-11.84-4.94-13.25-11.51L4.13 31.24C6.81 39.27 14.53 46 24 46z"/>
    <path fill="none" d="M2 2h44v44H2z"/>
  </svg>
);

export function AuthForm({ isSignUp = false, onSubmit, loading: emailPasswordLoading }: AuthFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  const { signInWithGoogle, loading: googleLoading } = useAuth(); // Use auth hook's loading for Google
  const router = useRouter();

  const submitHandler: SubmitHandler<FormValues> = (data) => {
    onSubmit(data);
  };

  const handleGoogleSignIn = async () => {
    const result = await signInWithGoogle();
    if (result && 'uid' in result) {
      router.push('/');
    }
    // Error handling is done within useAuth hook via toasts
  };
  
  const overallLoading = emailPasswordLoading || googleLoading;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary text-center">
            {isSignUp ? 'Create Account' : 'Welcome Back!'}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp ? 'Sign up to start managing your summer budget.' : 'Sign in to access your budget planner.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(submitHandler)}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="you@example.com" disabled={overallLoading}/>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} placeholder="••••••••" disabled={overallLoading}/>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={overallLoading}>
              {emailPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={overallLoading}>
              {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Sign In with Google
            </Button>

            <div className="text-center text-sm mt-2">
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    Sign In
                  </Link>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="font-medium text-primary hover:underline">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
