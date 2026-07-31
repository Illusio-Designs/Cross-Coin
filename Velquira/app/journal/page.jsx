import JournalClient from './JournalClient';

export const revalidate = 300;
export const metadata = { title: 'Journal' };

export default function JournalPage() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Journal</span>
        <h1>Stories &amp; guides</h1>
        <p>Notes on comfort, technology and life in motion.</p>
      </div>

      <JournalClient />
    </div>
  );
}
