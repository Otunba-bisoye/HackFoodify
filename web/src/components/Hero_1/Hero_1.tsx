import './Hero_1.css';
import { Hero_1Illustration } from './Hero_1Illustration';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Hero_1 = () => {
  const [heroQuery, setHeroQuery] = useState('');
  const navigate = useNavigate();

  const handleOrderNow = () => {
    const trimmed = heroQuery.trim();
    navigate(trimmed ? `/discover?q=${encodeURIComponent(trimmed)}` : '/discover');
  };

  return (
    <div className="hero">
      {/* The Inline Vector SVG Background */}
      <Hero_1Illustration />

      {/* Animated Clouds Layer */}
      <div className="cloud cloud-1"></div>
      <div className="cloud cloud-2"></div>
      <div className="cloud cloud-3"></div>

      {/* Hero Content / Call to Action */}
      <div className="hero-content">
        <h1>Hungry? Say less.</h1>

        <div className="hero-search-box">
          <input
            type="text"
            value={heroQuery}
            onChange={(e) => setHeroQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleOrderNow();
            }}
            placeholder="Search for restaurants, foods, vendors or your location for suggestions..."
          />
          <button
            type="button"
            className="hero-search-btn"
            onClick={handleOrderNow}
          >
            Order now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero_1;