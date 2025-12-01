import React from 'react';
import Link from 'next/link';
import { createAuthClient } from '@/app/lib/supabase-server';
import './character.css';

export default async function CharacterPage({ params }) {
    const slug = params?.slug;

    const supabase = createAuthClient();
    const { data, error } = await supabase
        .from('characters')
        .select('id, slug, name, tagline, title, subtitle, tags, avatar_url, spec_data, phases:character_story_phases(id, phase_order, name, description, greetings:character_greetings(id, greeting_order, title, metadata))')
        .eq('slug', slug)
        .order('phase_order', { referencedTable: 'character_story_phases', ascending: true })
        .single();

    if (error || !data) {
        return (
            <div className="error-page">
                <h1>Character Not Found</h1>
                <Link href="/browse">Browse All Characters</Link>
            </div>
        );
    }

    const content = data.spec_data || {};
    // Fetch greetings to build the flat episode list (ordered by greeting_order)
    let greetings = [];
    try {
        const { data: greetingsData, error: greetingsError } = await supabase
            .from('character_greetings')
            .select('id, greeting_order, story_phase_id, title, metadata')
            .eq('character_id', data.id)
            .order('greeting_order', { ascending: true });
        if (!greetingsError && Array.isArray(greetingsData)) {
            greetings = greetingsData;
        }
    } catch (e) {
        // Silently ignore greeting fetch errors to avoid breaking the page
        greetings = [];
    }

    let rundown = {};
    try {
        const { data: rundown, error: greetingsError } = await supabase
            .from('character_description_sections')
            .select('content')
            .eq('character_id', data.id)
            .eq('section', 'rundown')
            .single();
    } catch (e) {
        // Silently ignore greeting fetch errors to avoid breaking the page
        greetings = [];
    }

    const safeHero = {
        title: data.name,
        subtitle: data.subtitle,
        description: data.tagline ?? '',
        image: data.spec_data?.chubAI?.avatar_wide_url ?? data.avatar_url ?? '',
        badge: content?.hero?.badge ?? 'Series',
        stats: [
            {icon: 'film', value: greetings.length, 'label': 'Episodes'},
            {icon: 'th-list', value: data.phases?.length || 1, 'label': 'Phases'},
        ],
        actions: Array.isArray(content?.hero?.actions) ? content.hero.actions : [],
    };
    const safeTags = Array.isArray(content?.tags) ? content.tags : Array.isArray(data.tags) ? data.tags : [];
    const safeAbout = content?.about ?? {
        title: 'About This Series',
        mainContent: [],
        sidebar: { title: 'Series Details', details: Object.entries(rundown.content || {}) },
    };
    const safeUniqueFeature = content?.uniqueFeature ?? null;
    const safePhases = Array.isArray(data?.phases) ? data.phases : [];
    const safeEmotionalArcs = Array.isArray(data?.phases) ? data.phases : [];
    const safeCta = content?.cta ?? null;

    const hero = safeHero;
    const tags = safeTags;
    const about = safeAbout;
    const uniqueFeature = safeUniqueFeature;
    const phases = safePhases;
    const emotionalArcs = safeEmotionalArcs;
    const cta = safeCta;

    return (
        <>
            {/* Navigation */}
            <nav className="nav">
                <div className="nav-content">
                    <Link href="/" className="nav-brand">Chubflix</Link>
                    <div className="nav-links">
                        <Link href="/" className="nav-link">Home</Link>
                        <Link href="/browse" className="nav-link">Browse</Link>
                        {hero.actions && hero.actions[0]?.url && (
                            <a href={hero.actions[0].url} className="nav-cta" target="_blank" rel="noopener noreferrer">
                                Watch Now
                            </a>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg"></div>
                <img src={hero.image} alt={hero.title} className="hero-image" />
                <div className="hero-content">
                    <div className="hero-meta">
                        <span className="hero-badge">{hero.badge}</span>
                        <div className="hero-stats">
                            {hero.stats?.map((stat, idx) => (
                                <span key={idx}>
                                    <i className={`fa fa-${stat.icon}`}></i>
                                    {stat.value} {stat.label}
                                </span>
                            ))}
                        </div>
                    </div>
                    <h1>{hero.title}</h1>
                    <div className="hero-subtitle">{hero.subtitle}</div>
                    <p className="hero-description">{hero.description}</p>
                    <div className="hero-actions">
                        {hero.actions?.map((action, idx) => (
                            <a
                                key={idx}
                                href={action.url}
                                className={`btn-${action.type}`}
                                target={action.url.startsWith('http') ? '_blank' : undefined}
                                rel={action.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                            >
                                <i className={`fa fa-${action.icon}`}></i>
                                {action.label}
                            </a>
                        ))}

                        {/* Quick links to tools */}
                        <Link href={`/character-creator?characterId=${data.id}`} className="btn-primary">
                            <i className="fa fa-comments"></i>
                            Open in Character Creator
                        </Link>
                        <Link href={`/avatar-builder?characterId=${data.id}`} className="btn-secondary" style={{ marginLeft: '0.5rem' }}>
                            <i className="fa fa-image"></i>
                            Open in Avatar Builder
                        </Link>
                    </div>
                </div>
            </section>

            {/* Tags */}
            <section className="tags-section">
                <div className="tags-container">
                    {tags?.map((tag, idx) => (
                        <span key={idx} className="tag">{tag}</span>
                    ))}
                </div>
            </section>

            {/* Episodes (from Greetings) */}
            {Array.isArray(greetings) && greetings.length > 0 && (
                <section className="episodes" id="episodes">
                    <div className="episodes-header">
                        <h2>Episodes</h2>
                        <p className="episodes-subtitle">
                            A curated list of episodes for this character, ordered for best experience.
                        </p>
                    </div>
                    <div className="phase">
                        <div className="episodes-grid">
                            {greetings.map((g) => {
                                const meta = g?.metadata || {};
                                const desc = meta?.description || '';
                                return (
                                    <div key={g.id} className="episode-card">
                                        <div className="episode-number">Episode {g.greeting_order}</div>
                                        <div className="episode-title">{g.title || `Episode ${g.greeting_order}`}</div>
                                        {desc && (
                                            <div className="episode-description">{desc}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* About Section */}
            <section className="about">
                <div className="about-content">
                    <div className="about-main">
                        <h2>{about.title}</h2>
                        {about.mainContent.map((paragraph, idx) => (
                            <p key={idx}>{paragraph}</p>
                        ))}
                    </div>
                    <div className="about-sidebar">
                        <h3>{about.sidebar.title}</h3>
                        {about.sidebar.details.map((detail, idx) => (
                            <div key={idx} className="about-detail">
                                <div className="about-detail-label">{detail.label}</div>
                                <div className="about-detail-value">{detail.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Unique Feature (if exists) */}
            {uniqueFeature && (
                <section className="feature">
                    <div className="feature-content">
                        <h2>{uniqueFeature.title}</h2>
                        <p>{uniqueFeature.description}</p>
                        {uniqueFeature.example && (
                            <div className="inner-monologue-example">{uniqueFeature.example}</div>
                        )}
                    </div>
                </section>
            )}

            {/* Episodes by Phase */
            }
            <section className="episodes">
                <div className="episodes-header">
                    <h2>Episodes by Phase</h2>
                    <p className="episodes-subtitle">
                        The series unfolds across {phases.length} phases. Each episode can be enjoyed standalone,
                        but watching in order reveals deeper character development and callbacks.
                    </p>
                </div>

                {phases.map((phase, phaseIdx) => (
                    <div key={phaseIdx} className="phase">
                        <div className="phase-header">
                            <span className="phase-number">{phase.phase_order}</span>
                            <div className="phase-title">{phase.name}</div>
                            <div className="phase-meta">{phase.description}</div>
                        </div>
                        <div className="episodes-grid">
                            {phase.greetings?.map((episode, epIdx) => (
                                <div key={epIdx} className="episode-card">
                                    <div className="episode-number">Episode {episode.greeting_order}</div>
                                    <div className="episode-title">{episode.title}</div>
                                    <div className="episode-description">{episode.metadata?.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>

            {/* Emotional Arcs */}
            {emotionalArcs && (
                <section className="arcs">
                    <div className="arcs-content">
                        <h2>Character Development</h2>
                        <div className="arcs-grid">
                            {emotionalArcs.map((arc, arcIdx) => (
                                <div key={arcIdx} className="arc-card">
                                    <h3>{arc.name}</h3>
                                    <div className="arc-progression">
                                        {arc.greetings?.map((step, stepIdx) => (
                                            <>
                                                <span className="arc-step">P{step.greeting_order}{step.greeting_order ? ` • Ep ${step.greeting_order}` : ''}: {step.title}</span>
                                                {stepIdx < arc.greetings.length - 1 && <span className="arc-arrow">→</span>}
                                            </>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CTA Section */}
            {cta && (
                <section className="cta-section">
                    <h2>{cta.title}</h2>
                    <p>{cta.description}</p>
                    <a
                        href={cta.url}
                        className="btn-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i className="fa fa-play"></i>
                        Start Episode 1
                    </a>
                </section>
            )}

            {/* Footer */}
            <footer className="footer">
                <div className="footer-brand">Chubflix</div>
                <div className="footer-links">
                    <Link href="/">Home</Link>
                    <Link href="/browse">Browse</Link>
                    <a href="https://chub.ai/users/ricktap" target="_blank" rel="noopener noreferrer">Chub.AI</a>
                </div>
                <div className="footer-copyright">
                    &copy; 2025 Chubflix by ricktap. All characters are works of fiction.
                </div>
            </footer>
        </>
    );
}
