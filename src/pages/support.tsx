import React from 'react';
import Layout from '@theme/Layout';

type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

interface Ticket {
  id: number;
  category: string;
  subject: string;
  description: string;
  fileName: string | null;
  status: TicketStatus;
  createdAt: string;
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open: '#f0a500',
  'In Progress': '#2e8555',
  Resolved: '#888',
};

export default function SupportPage(): React.JSX.Element {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [category, setCategory] = React.useState('Integration Issue');
  const [subject, setSubject] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const nextId = React.useRef(1);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.files?.[0]?.name ?? null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    const ticket: Ticket = {
      id: nextId.current++,
      category,
      subject: subject.trim(),
      description: description.trim(),
      fileName,
      status: 'Open',
      createdAt: new Date().toLocaleString(),
    };

    setTickets(prev => [ticket, ...prev]);
    setSubject('');
    setDescription('');
    setFileName(null);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.8rem',
    borderRadius: 6,
    border: '1px solid var(--ifm-color-emphasis-300)',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    background: 'var(--ifm-background-color)',
    color: 'var(--ifm-font-color-base)',
  };

  return (
    <Layout title="Support" description="Submit a support ticket">
      <main id="main-content" style={{ padding: '3rem 1.5rem', maxWidth: 820, margin: '0 auto' }}>
        <h1>Support</h1>
        <p style={{ color: 'var(--ifm-color-emphasis-600)' }}>
          Reach out to the ProxyPay team. We'll get back to you via email.
        </p>

        {/* Ticket form */}
        <section style={{ background: 'var(--ifm-card-background-color, var(--ifm-background-surface-color))', border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: 8, padding: '2rem', marginBottom: '3rem' }}>
          <h2 style={{ marginTop: 0 }}>Submit a Ticket</h2>

          {submitted && (
            <div style={{ background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
              Ticket submitted successfully! We'll respond shortly.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label htmlFor="category" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Category</label>
              <select id="category" value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                <option>Integration Issue</option>
                <option>Billing</option>
                <option>KYC</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="subject" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Subject <span aria-hidden="true">*</span></label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="description" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Description <span aria-hidden="true">*</span></label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your issue in detail..."
                required
                rows={5}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label htmlFor="attachment" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Attachment <span style={{ fontWeight: 400, color: 'var(--ifm-color-emphasis-500)' }}>(optional)</span></label>
              <input id="attachment" type="file" onChange={handleFile} style={{ fontSize: '0.9rem' }} />
              {fileName && <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-600)' }}>Selected: {fileName}</p>}
            </div>

            <div>
              <button type="submit" className="button button--primary">Submit Ticket</button>
            </div>
          </form>
        </section>

        {/* My Tickets */}
        <section>
          <h2>My Tickets</h2>
          {tickets.length === 0 ? (
            <p style={{ color: 'var(--ifm-color-emphasis-500)' }}>No tickets submitted yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tickets.map(ticket => (
                <div key={ticket.id} style={{ border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: 8, padding: '1.2rem 1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-500)' }}>#{ticket.id}</span>
                      <strong>{ticket.subject}</strong>
                      <span style={{ fontSize: '0.75rem', background: 'var(--ifm-color-emphasis-100)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>{ticket.category}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: STATUS_COLORS[ticket.status] }}>
                      {ticket.status}
                    </span>
                  </div>
                  <p style={{ margin: '0.6rem 0 0', fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-700)', whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
                  {ticket.fileName && <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-500)' }}>Attachment: {ticket.fileName}</p>}
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-400)' }}>Submitted {ticket.createdAt}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}
