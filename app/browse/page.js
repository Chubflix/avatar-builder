'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import './browse.css';

export default function BrowsePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [visibleCount, setVisibleCount] = useState(0);
    const [items, setItems] = useState([]); // raw items from API
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch characters from public API
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        fetch('/api/public/characters')
            .then(async (res) => {
                if (!res.ok) {
                    const t = await res.text();
                    throw new Error(t || 'Failed to load characters');
                }
                return res.json();
            })
            .then((data) => {
                if (!isMounted) return;
                // Map DB records to UI shape used by the grid
                const mapped = (data || []).map((c) => ({
                    name: c.title || c.name,
                    subtitle: c.subtitle || '',
                    tags: Array.isArray(c.tags) ? c.tags : [],
                    image: c.avatar_url || null,
                    url: c.slug ? `/characters/${c.slug}` : '#',
                    // Optional fields preserved for sorting/UI compatibility
                    episodes: c.episode_count || 0,
                    genre: c.genre || 'drama',
                    badge: c.badge || undefined,
                }));
                setItems(mapped);
                setError(null);
            })
            .catch((e) => {
                if (!isMounted) return;
                setError(e.message || 'Failed to load characters');
            })
            .finally(() => {
                if (!isMounted) return;
                setLoading(false);
            });
        return () => { isMounted = false; };
    }, []);

    const filteredSeries = useMemo(() => {
        let source = items;
        // Filter
        let filtered = source.filter((s) => {
            const name = (s.name || '').toLowerCase();
            const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
                (Array.isArray(s.tags) && s.tags.some(tag => (tag || '').toLowerCase().includes(searchTerm.toLowerCase())));
            const matchesGenre = selectedGenre === 'all' || s.genre === selectedGenre;
            return matchesSearch && matchesGenre;
        });
        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return (a.name || '').localeCompare(b.name || '');
            } else if (sortBy === 'episodes') {
                return (b.episodes || 0) - (a.episodes || 0);
            } else if (sortBy === 'newest') {
                // If API includes created_at in the future, can use that; for now fallback to name desc
                return (b.episodes || 0) - (a.episodes || 0);
            }
            return 0;
        });
        setVisibleCount(filtered.length);
        return filtered;
    }, [items, searchTerm, selectedGenre, sortBy]);


    return (
        <>
            {/* Navigation */}
            <nav className="browse-nav">
                <div className="nav-content">
                    <Link href="/" className="nav-brand">Chubflix</Link>
                    <div className="nav-links">
                        <Link href="/" className="nav-link">Home</Link>
                        <Link href="/browse" className="nav-link active">Browse</Link>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <section className="browse-header">
                <div className="header-content">
                    <h1>Browse All Series</h1>
                    <p>Explore the complete Chubflix catalog</p>
                </div>
            </section>

            {/* Filters */}
            <section className="browse-filters">
                <div className="filters-content">
                    <div className="filter-group">
                        <span className="filter-label">Genre:</span>
                        <select
                            className="filter-select"
                            value={selectedGenre}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                        >
                            <option value="all">All Genres</option>
                            <option value="workplace">Workplace</option>
                            <option value="romance">Romance</option>
                            <option value="slice-of-life">Slice of Life</option>
                            <option value="drama">Drama</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">Sort:</span>
                        <select
                            className="filter-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="name">Name A-Z</option>
                            <option value="episodes">Most Episodes</option>
                            <option value="newest">Newest</option>
                        </select>
                    </div>
                    <div className="search-box">
                        <i className="fa fa-search search-icon"></i>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search series..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <span className="results-count">{visibleCount} series</span>
                </div>
            </section>

            {/* Series Grid */}
            <section className="series-section">
                {loading && (
                    <div className="no-results active">
                        <h3>Loading...</h3>
                        <p>Fetching characters from the database</p>
                    </div>
                )}
                {error && !loading && (
                    <div className="no-results active">
                        <h3>Failed to load</h3>
                        <p>{error}</p>
                    </div>
                )}
                <div className="series-grid">
                    {filteredSeries.map((s, idx) => (
                        <Link key={idx} href={s.url} className="series-card">
                            <div className="series-poster">
                                {s.image ? (
                                    <img src={s.image} alt={s.name} />
                                ) : (
                                    <div className="series-poster-placeholder">
                                        <i className="fa fa-user"></i>
                                    </div>
                                )}
                                {s.episodes > 0 && (
                                    <span className="series-badge">{s.episodes} Ep</span>
                                )}
                                {s.badge && (
                                    <span className="series-badge">{s.badge}</span>
                                )}
                            </div>
                            <div className="series-info">
                                <div className="series-title">{s.name}</div>
                                <div className="series-meta">{s.subtitle}</div>
                                <div className="series-tags">
                                    {s.tags.map((tag, i) => (
                                        <span key={i} className="series-tag">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {visibleCount === 0 && (
                    <div className="no-results active">
                        <h3>No series found</h3>
                        <p>Try adjusting your filters or search term</p>
                    </div>
                )}
            </section>

            {/* Footer */}
            <footer className="browse-footer">
                <div className="footer-brand">Chubflix</div>
                <div className="footer-links">
                    <Link href="/">Home</Link>
                    <a href="https://chub.ai/users/ricktap" target="_blank" rel="noopener noreferrer">Chub.AI</a>
                    <a href="https://github.com/ricktap" target="_blank" rel="noopener noreferrer">GitHub</a>
                </div>
                <div className="footer-copyright">
                    &copy; 2025 Chubflix by ricktap. All characters are works of fiction.
                </div>
            </footer>
        </>
    );
}
