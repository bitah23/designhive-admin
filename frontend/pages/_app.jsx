import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import '../styles/globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-quill-new/dist/quill.snow.css';

const PUBLIC_PAGES = ['/login'];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const isPublic = PUBLIC_PAGES.includes(router.pathname);

    if (!token && !isPublic) {
      router.replace('/login');
      return;
    }
    if (token && isPublic) {
      router.replace('/dashboard');
      return;
    }
    setReady(true);
  }, [router.pathname]);

  // Hold render until auth state is resolved to prevent flash of wrong page
  if (!ready) {
    return <div style={{ background: '#0A0A0F', minHeight: '100vh' }} />;
  }

  if (PUBLIC_PAGES.includes(router.pathname)) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ style: { background: '#11131A', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' } }} />
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <Layout>
      <Toaster position="top-right" toastOptions={{ style: { background: '#11131A', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' } }} />
      <Component {...pageProps} />
    </Layout>
  );
}
