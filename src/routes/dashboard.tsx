/** /dashboard — resume list + account status for authenticated users. */
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  PlusCircle,
  FileText,
  Trash2,
  LogOut,
  Clock,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResumeRow {
  id: string;
  title: string;
  template_id: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Data fetching helpers
// ---------------------------------------------------------------------------

async function fetchResumes(userId: string): Promise<ResumeRow[]> {
  const { data, error } = await supabase
    .from('resumes')
    .select('id, title, template_id, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ResumeRow[];
}

async function deleteResume(id: string): Promise<void> {
  const { error } = await supabase.from('resumes').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Redirect to sign-in once we know the user is not authenticated
  if (!userLoading && !user) {
    // Use window.location so the router type system doesn't complain
    // TODO(sprint-2): replace with <Navigate> once auth context is wired into router
    if (typeof window !== 'undefined') window.location.href = '/sign-in';
    return null;
  }

  const {
    data: resumes,
    isLoading: resumesLoading,
    error: resumesError,
  } = useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: () => fetchResumes(user!.id),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes', user?.id] });
      toast.success('Resume deleted.');
      setConfirmDeleteId(null);
    },
    onError: () => {
      toast.error('Could not delete resume. Please try again.');
    },
  });

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const isLoading = userLoading || resumesLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">Plate &amp; Pen</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Hospitality CV Studio
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Page title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">My CVs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build, edit and download your hospitality resumes.
            </p>
          </div>
          <Link to="/">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New CV
            </Button>
          </Link>
        </div>

        {/* Resume grid */}
        {isLoading ? (
          <ResumeGridSkeleton />
        ) : resumesError ? (
          <p className="text-sm text-destructive">
            Failed to load your CVs. Please refresh the page.
          </p>
        ) : !resumes || resumes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                isDeleting={deleteMutation.isPending && confirmDeleteId === resume.id}
                isConfirmingDelete={confirmDeleteId === resume.id}
                onDeleteRequest={() => setConfirmDeleteId(resume.id)}
                onDeleteConfirm={() => deleteMutation.mutate(resume.id)}
                onDeleteCancel={() => setConfirmDeleteId(null)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ResumeCardProps {
  resume: ResumeRow;
  isDeleting: boolean;
  isConfirmingDelete: boolean;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function ResumeCard({
  resume,
  isDeleting,
  isConfirmingDelete,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: ResumeCardProps) {
  const updatedAt = new Date(resume.updated_at);
  const timeAgo = formatTimeAgo(updatedAt);

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md',
        isConfirmingDelete && 'border-destructive/50',
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </div>

      <h3 className="truncate font-semibold leading-snug">{resume.title || 'Untitled CV'}</h3>
      <p className="mt-0.5 text-xs capitalize text-muted-foreground">{resume.template_id} template</p>

      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Updated {timeAgo}</span>
      </div>

      {isConfirmingDelete ? (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={isDeleting}
            onClick={onDeleteConfirm}
          >
            {isDeleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Delete
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={onDeleteCancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          {/* TODO(sprint-2): link to builder pre-loaded with this resume's data */}
          <Link to="/" className="flex-1">
            <Button size="sm" variant="outline" className="w-full">
              Edit
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDeleteRequest}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <FileText className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold">No CVs yet</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Build your first hospitality resume — it takes about 5 minutes.
      </p>
      <Link to="/" className="mt-5">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Build my first CV
        </Button>
      </Link>
    </div>
  );
}

function ResumeGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-2 h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
