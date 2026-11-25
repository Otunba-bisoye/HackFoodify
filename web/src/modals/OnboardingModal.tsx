type Props = { isVisible: boolean; onComplete: () => void };

export default function OnboardingModal({ isVisible, onComplete }: Props) {
  if (!isVisible) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, maxWidth: 360 }}>
        <h2>Welcome!</h2>
        <p>Finish setting up your store to start receiving orders.</p>
        <button type="button" onClick={onComplete}>Got it</button>
      </div>
    </div>
  );
}