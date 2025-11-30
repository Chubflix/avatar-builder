'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
    useEffect(() => {
        // Nav background on scroll
        const handleScroll = () => {
            const nav = document.getElementById('nav');
            if (window.scrollY > 50) {
                nav?.classList.add('scrolled');
            } else {
                nav?.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            {/* Navigation */}
            <nav className="nav" id="nav">
                <div className="nav-content">
                    <Link href="/" className="nav-brand">Chubflix</Link>
                    <div className="nav-links">
                        <a href="#series" className="nav-link">Series</a>
                        <a href="#tools" className="nav-link">Tools</a>
                        <a href="#genres" className="nav-link">Genres</a>
                        <a href="#about" className="nav-link">About</a>
                        <Link href="/browse" className="nav-cta">Browse All</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg"></div>
                <div className="hero-content">
                    <div className="hero-badge">
                        <i className="fa fa-circle"></i>
                        Interactive Streaming
                    </div>
                    <h1>Stories where you&apos;re the co-protagonist</h1>
                    <p className="hero-tagline">
                        Binge-worthy character arcs. Episodic narratives. Emotional depth that&apos;s earned, not given.
                        Each series unfolds across multiple episodes—and your choices shape how scenes play out.
                    </p>
                    <div className="hero-actions">
                        <Link href="/character-creator" className="btn-primary">
                            <i className="fa fa-play"></i>
                            Start Watching
                        </Link>
                        <a href="#about" className="btn-secondary">
                            <i className="fa fa-info-circle"></i>
                            How It Works
                        </a>
                    </div>
                </div>
            </section>

            {/* Featured Series */}
            <section className="featured" id="series">
                <div className="section-header">
                    <h2 className="section-title">Popular Series</h2>
                    <Link href="/browse" className="section-link">
                        View All <i className="fa fa-chevron-right"></i>
                    </Link>
                </div>
                <div className="shows-row">
                    <Link href="/characters/erin-takahashi" className="show-card">
                        <div className="show-poster">
                            <img src="https://avatars.charhub.io/avatars/ricktap/erin-takahashi-the-project-manager-02db87f913ca/chara_card_v2.png" alt="Erin Takahashi" />
                            <div className="show-overlay">
                                <div className="show-overlay-title">The Guarded Professional</div>
                                <div className="show-overlay-desc">High-achiever hiding deep insecurities. Success masking imposter syndrome. Slow trust-building.</div>
                            </div>
                        </div>
                        <div className="show-info">
                            <div className="show-title">Erin Takahashi</div>
                            <div className="show-meta">11 Episodes • Drama</div>
                        </div>
                    </Link>
                    <Link href="/characters/sofia-mendes" className="show-card">
                        <div className="show-poster">
                            <img src="https://avatars.charhub.io/avatars/ricktap/sofia-mendes-the-adventurous-stewardess-520cc6602e8c/chara_card_v2.png" alt="Sofia Mendes" />
                            <div className="show-overlay">
                                <div className="show-overlay-title">The Polyamorous Explorer</div>
                                <div className="show-overlay-desc">Balancing passion with patience. Compersion shown, tested, and earned across complex dynamics.</div>
                            </div>
                        </div>
                        <div className="show-info">
                            <div className="show-title">Sofia Mendes</div>
                            <div className="show-meta">16 Episodes • Drama</div>
                        </div>
                    </Link>
                    <div className="show-card">
                        <div className="show-poster">
                            <div className="show-poster-placeholder"><i className="fa fa-user"></i></div>
                            <div className="show-overlay">
                                <div className="show-overlay-title">The Wholesome Underdog</div>
                                <div className="show-overlay-desc">Communication barriers meeting wistful optimism. Misunderstandings that aren&apos;t anyone&apos;s fault.</div>
                            </div>
                        </div>
                        <div className="show-info">
                            <div className="show-title">Emma Sinclair</div>
                            <div className="show-meta">Coming Soon</div>
                        </div>
                    </div>
                    <Link href="/character-creator" className="show-card">
                        <div className="show-poster">
                            <div className="show-poster-placeholder"><i className="fa fa-plus"></i></div>
                            <div className="show-overlay">
                                <div className="show-overlay-title">More Series</div>
                                <div className="show-overlay-desc">New series added regularly. Different emotional landscapes to explore.</div>
                            </div>
                        </div>
                        <div className="show-info">
                            <div className="show-title">Browse All</div>
                            <div className="show-meta">22+ Characters</div>
                        </div>
                    </Link>
                </div>
            </section>

            {/* Tools Section */}
            <section className="tools-section" id="tools">
                <div className="tools-header">
                    <h2>Creator Tools</h2>
                    <p>Build and design your own interactive characters with our suite of creative tools.</p>
                </div>
                <div className="tools-grid">
                    <Link href="/character-creator" className="tool-card">
                        <div className="tool-icon">
                            <i className="fa fa-users"></i>
                        </div>
                        <h3>Character Creator</h3>
                        <p className="tool-desc">
                            Create detailed character profiles with personality traits, backstories, and conversation styles.
                            Design episodic narratives with multi-phase story arcs.
                        </p>
                        <div className="tool-cta">
                            Open Creator <i className="fa fa-arrow-right"></i>
                        </div>
                    </Link>
                    <Link href="/avatar-builder" className="tool-card">
                        <div className="tool-icon">
                            <i className="fa fa-image"></i>
                        </div>
                        <h3>Avatar Builder</h3>
                        <p className="tool-desc">
                            Generate character images using Stable Diffusion. Organize your creations in folders,
                            apply LoRAs, and build a visual library for your characters.
                        </p>
                        <div className="tool-cta">
                            Open Builder <i className="fa fa-arrow-right"></i>
                        </div>
                    </Link>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works" id="about">
                <div className="how-header">
                    <h2>TV Series, Interactive</h2>
                    <p>Each character is a show. Each greeting is an episode. Your choices shape the story.</p>
                </div>
                <div className="structure-row">
                    <div className="structure-item">
                        <div className="structure-icon"><i className="fa fa-film"></i></div>
                        <h3>Episodes</h3>
                        <div className="subtitle">Greetings</div>
                        <p>Self-contained scenes with descriptive titles. Works standalone, but sequential viewing reveals callbacks and growth.</p>
                    </div>
                    <div className="structure-item">
                        <div className="structure-icon"><i className="fa fa-th-list"></i></div>
                        <h3>Seasons</h3>
                        <div className="subtitle">Phases</div>
                        <p>2-3 act structure: setup, complications, resolution. Each phase explores different facets of the character&apos;s journey.</p>
                    </div>
                    <div className="structure-item">
                        <div className="structure-icon"><i className="fa fa-television"></i></div>
                        <h3>Series</h3>
                        <div className="subtitle">Characters</div>
                        <p>Complete arcs with beginning, middle, end. Different genres, themes, and relationship dynamics to explore.</p>
                    </div>
                </div>
            </section>

            {/* Genres */}
            <section className="genres" id="genres">
                <div className="section-header">
                    <h2 className="section-title">Browse by Genre</h2>
                </div>
                <div className="genres-grid">
                    <div className="genre-card">
                        <div className="genre-title">
                            <i className="fa fa-briefcase"></i>
                            Workplace Drama
                        </div>
                        <div className="genre-desc">
                            Office politics, imposter syndrome, professional facades hiding personal struggles. Slow-burn trust building.
                        </div>
                        <div className="genre-tags">
                            <span className="genre-tag">Career</span>
                            <span className="genre-tag">Vulnerability</span>
                            <span className="genre-tag">Achievement</span>
                        </div>
                    </div>
                    <div className="genre-card">
                        <div className="genre-title">
                            <i className="fa fa-heart"></i>
                            Relationship Complexity
                        </div>
                        <div className="genre-desc">
                            Polyamory, compersion, boundary negotiation. Exploring non-traditional dynamics with emotional authenticity.
                        </div>
                        <div className="genre-tags">
                            <span className="genre-tag">Polyamory</span>
                            <span className="genre-tag">Communication</span>
                            <span className="genre-tag">Growth</span>
                        </div>
                    </div>
                    <div className="genre-card">
                        <div className="genre-title">
                            <i className="fa fa-comments"></i>
                            Communication Barriers
                        </div>
                        <div className="genre-desc">
                            Misunderstandings that aren&apos;t anyone&apos;s fault. Patience as the path forward. Optimism meeting reality.
                        </div>
                        <div className="genre-tags">
                            <span className="genre-tag">Patience</span>
                            <span className="genre-tag">Understanding</span>
                            <span className="genre-tag">Connection</span>
                        </div>
                    </div>
                    <div className="genre-card">
                        <div className="genre-title">
                            <i className="fa fa-globe"></i>
                            Cultural Identity
                        </div>
                        <div className="genre-desc">
                            Displacement, belonging, identity negotiation between worlds. Finding home in unexpected places.
                        </div>
                        <div className="genre-tags">
                            <span className="genre-tag">Identity</span>
                            <span className="genre-tag">Belonging</span>
                            <span className="genre-tag">Culture</span>
                        </div>
                    </div>
                    <div className="genre-card">
                        <div className="genre-title">
                            <i className="fa fa-user-secret"></i>
                            Internal Conflict
                        </div>
                        <div className="genre-desc">
                            What you show the world vs. who you really are. Defense mechanisms, contradictions, and gradual vulnerability.
                        </div>
                        <div className="genre-tags">
                            <span className="genre-tag">Psychology</span>
                            <span className="genre-tag">Authenticity</span>
                            <span className="genre-tag">Trust</span>
                        </div>
                    </div>
                    <div className="genre-card">
                        <div className="genre-title">
                            <i className="fa fa-coffee"></i>
                            Slice of Life
                        </div>
                        <div className="genre-desc">
                            Mundane settings made meaningful. Cafés, apartments, everyday moments. Drama from internal conflicts, not action.
                        </div>
                        <div className="genre-tags">
                            <span className="genre-tag">Everyday</span>
                            <span className="genre-tag">Authentic</span>
                            <span className="genre-tag">Grounded</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* What Makes It Different */}
            <section className="difference">
                <div className="difference-content">
                    <div className="difference-text">
                        <h2>Not your typical AI chat</h2>
                        <p>
                            These aren&apos;t fantasy-fulfillment characters that tell you what you want to hear.
                            They&apos;re emotionally authentic people with real flaws, contradictions, and growth arcs
                            that unfold gradually—the way actual change happens.
                        </p>
                        <ul className="difference-list">
                            <li>
                                <i className="fa fa-check"></i>
                                <div>
                                    <strong>Earned Growth</strong>
                                    <span>Vulnerabilities don&apos;t disappear. Progress comes through experience, not magic fixes.</span>
                                </div>
                            </li>
                            <li>
                                <i className="fa fa-check"></i>
                                <div>
                                    <strong>User Agency</strong>
                                    <span>Your choices shape scenes. The narrative never assumes your thoughts or feelings.</span>
                                </div>
                            </li>
                            <li>
                                <i className="fa fa-check"></i>
                                <div>
                                    <strong>Arc Continuity</strong>
                                    <span>Earlier episodes inform later ones. Relationships evolve. Callbacks enhance immersion.</span>
                                </div>
                            </li>
                            <li>
                                <i className="fa fa-check"></i>
                                <div>
                                    <strong>Emotional Realism</strong>
                                    <span>Show, don&apos;t tell. Physical manifestations of emotion. Concrete details over adjectives.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="difference-visual">
                        <div className="arc-visual">
                            <div className="arc-phase">
                                <div className="arc-dot">1</div>
                                <div className="arc-content">
                                    <h4>Setup & Discovery</h4>
                                    <p>Meet the character. Understand their world. Initial connection building. First hints of deeper layers.</p>
                                </div>
                            </div>
                            <div className="arc-phase">
                                <div className="arc-dot">2</div>
                                <div className="arc-content">
                                    <h4>Complications</h4>
                                    <p>Relationships tested. Internal conflicts surface. Vulnerabilities revealed. Stakes become personal.</p>
                                </div>
                            </div>
                            <div className="arc-phase">
                                <div className="arc-dot">3</div>
                                <div className="arc-content">
                                    <h4>Resolution</h4>
                                    <p>Working through conflicts together. Earned emotional payoffs. Commitment or meaningful closure.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <h2>Start your first series</h2>
                <p>
                    Browse the catalog. Pick a show. Begin from Episode 1 or dive into any scene that catches your eye.
                </p>
                <Link href="/browse" className="btn-primary">
                    <i className="fa fa-th-large"></i>
                    Browse All Series
                </Link>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-about">
                        <div className="footer-brand">Chubflix</div>
                        <p className="footer-description">
                            Interactive character-driven narratives with emotional depth.
                            Mini TV series where you become the co-protagonist.
                        </p>
                    </div>
                    <div className="footer-links-section">
                        <h4>Browse</h4>
                        <ul className="footer-links-list">
                            <li><Link href="/browse">All Series</Link></li>
                            <li><a href="#genres">Genres</a></li>
                            <li><a href="#about">How It Works</a></li>
                        </ul>
                    </div>
                    <div className="footer-links-section">
                        <h4>Tools</h4>
                        <ul className="footer-links-list">
                            <li><Link href="/character-creator">Character Creator</Link></li>
                            <li><Link href="/avatar-builder">Avatar Builder</Link></li>
                        </ul>
                    </div>
                    <div className="footer-links-section">
                        <h4>Connect</h4>
                        <ul className="footer-links-list">
                            <li><a href="https://chub.ai/users/ricktap" target="_blank" rel="noopener noreferrer">Chub.AI</a></li>
                            <li><a href="https://x.com/ricktap" target="_blank" rel="noopener noreferrer">Twitter/X</a></li>
                            <li><a href="https://github.com/ricktap" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2025 Chubflix by ricktap. All characters are works of fiction.</p>
                </div>
            </footer>
        </>
    );
}
