/**
 * Contributors Filter, Search, View Toggle and Table Sort
 * Provides filtering, search, grid/table view toggle, and sortable table
 * for the individual contributors page.
 * Features:
 * - URL parameter support for sharing filtered/sorted views
 * - Multiple thematic filters
 * - Real-time search
 * - Grid / Table view toggle
 * - Sortable table columns
 * - Clickable badges to activate thematic filters
 */

class ContributorsFilter {
    constructor() {
        this.contributors = [];
        this.filteredContributors = [];
        this.activeThematicFilters = new Set();
        this.searchQuery = '';
        this.currentView = 'grid';
        this.sortCol = 'total';
        this.sortDir = 'desc';

        this.init();
    }

    init() {
        this.cacheElements();
        this.parseContributors();
        this.loadFromURL();
        this.attachEventListeners();
        this.applyFilters();
    }

    cacheElements() {
        this.searchInput = document.getElementById('contributor-search');
        this.filterButtons = document.querySelectorAll('.filter-button');
        this.resetButton = document.getElementById('reset-filters');
        this.gridContainer = document.getElementById('contributors-grid-view');
        this.tableContainer = document.getElementById('contributors-table-view');
        this.tableBody = document.getElementById('contributors-table-body');
        this.statsShowing = document.getElementById('stats-showing');
        this.statsTotal = document.getElementById('stats-total');
        this.noResultsElement = document.querySelector('.contributors-no-results');
        this.gridBtn = document.getElementById('view-grid-btn');
        this.tableBtn = document.getElementById('view-table-btn');
        this.sortableHeaders = document.querySelectorAll('#contributors-table-view th.sortable');
    }

    parseContributors() {
        const cards = document.querySelectorAll('.contributor-card.individual');

        cards.forEach(card => {
            const contributor = {
                element: card.closest('.column'),
                login: card.querySelector('.title.is-4 a.external-link')?.textContent.trim() || '',
                isHonorary: card.classList.contains('honorary-member'),
                thematics: [],
                searchText: ''
            };

            const badges = card.querySelectorAll('.badge-filter-btn');
            badges.forEach(badge => {
                const thematic = badge.dataset.thematic;
                if (thematic) contributor.thematics.push(thematic);
            });

            contributor.searchText = [
                contributor.login,
                ...contributor.thematics.map(t => t.replace(/_/g, ' '))
            ].join(' ').toLowerCase();

            this.contributors.push(contributor);
        });

        this.filteredContributors = [...this.contributors];
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);

        const searchParam = params.get('search');
        if (searchParam) {
            this.searchQuery = searchParam.toLowerCase().trim();
            if (this.searchInput) this.searchInput.value = searchParam;
        }

        const filtersParam = params.get('filters');
        if (filtersParam) {
            filtersParam.split(',').filter(f => f.trim()).forEach(f => {
                this.activeThematicFilters.add(f.trim());
            });
        }

        const viewParam = params.get('view');
        if (viewParam === 'table') this.currentView = 'table';

        const sortParam = params.get('sort');
        if (sortParam) {
            const [col, dir] = sortParam.split(':');
            if (col) this.sortCol = col;
            if (dir === 'asc' || dir === 'desc') this.sortDir = dir;
        }

        this.updateFilterButtonsUI();
        this.applyViewToggle();
    }

    updateFilterButtonsUI() {
        this.filterButtons.forEach(button => {
            const thematic = button.dataset.thematic;
            button.classList.toggle('is-active', this.activeThematicFilters.has(thematic));
        });
    }

    applyViewToggle() {
        if (this.currentView === 'table') {
            if (this.gridContainer) this.gridContainer.style.display = 'none';
            if (this.tableContainer) this.tableContainer.style.display = '';
            if (this.gridBtn) this.gridBtn.classList.remove('is-active');
            if (this.tableBtn) this.tableBtn.classList.add('is-active');
        } else {
            if (this.gridContainer) this.gridContainer.style.display = '';
            if (this.tableContainer) this.tableContainer.style.display = 'none';
            if (this.gridBtn) this.gridBtn.classList.add('is-active');
            if (this.tableBtn) this.tableBtn.classList.remove('is-active');
        }
    }

    updateURL() {
        const params = new URLSearchParams();

        if (this.searchQuery) params.set('search', this.searchQuery);
        if (this.activeThematicFilters.size > 0) {
            params.set('filters', Array.from(this.activeThematicFilters).join(','));
        }
        if (this.currentView === 'table') params.set('view', 'table');
        if (this.sortCol !== 'total' || this.sortDir !== 'desc') {
            params.set('sort', `${this.sortCol}:${this.sortDir}`);
        }

        const newURL = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;

        window.history.replaceState({}, '', newURL);
    }

    attachEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.applyFilters();
                this.updateURL();
            });
        }

        this.filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const thematic = button.dataset.thematic;
                if (this.activeThematicFilters.has(thematic)) {
                    this.activeThematicFilters.delete(thematic);
                    button.classList.remove('is-active');
                } else {
                    this.activeThematicFilters.add(thematic);
                    button.classList.add('is-active');
                }
                this.applyFilters();
                this.updateURL();
            });
        });

        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetFilters());
        }

        if (this.gridBtn) {
            this.gridBtn.addEventListener('click', () => {
                this.currentView = 'grid';
                this.applyViewToggle();
                this.updateURL();
            });
        }

        if (this.tableBtn) {
            this.tableBtn.addEventListener('click', () => {
                this.currentView = 'table';
                this.applyViewToggle();
                this.applyTableFilters();
                this.sortTable();
                this.updateURL();
            });
        }

        this.sortableHeaders.forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.col;
                if (this.sortCol === col) {
                    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortCol = col;
                    this.sortDir = col === 'login' ? 'asc' : 'desc';
                }
                this.sortTable();
                this.updateURL();
            });
        });

        document.querySelectorAll('.badge-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const thematic = btn.dataset.thematic;
                if (this.activeThematicFilters.has(thematic)) {
                    this.activeThematicFilters.delete(thematic);
                } else {
                    this.activeThematicFilters.add(thematic);
                }
                this.updateFilterButtonsUI();
                this.applyFilters();
                this.updateURL();
            });
        });
    }

    applyFilters() {
        this.filteredContributors = this.contributors.filter(contributor => {
            let thematicMatch = true;
            if (this.activeThematicFilters.size > 0) {
                thematicMatch = contributor.thematics.some(t => this.activeThematicFilters.has(t));
            }

            let searchMatch = true;
            if (this.searchQuery) {
                searchMatch = contributor.searchText.includes(this.searchQuery);
            }

            return thematicMatch && searchMatch;
        });

        this.updateDisplay();
        this.updateStats();
        this.applyTableFilters();
        if (this.currentView === 'table') this.sortTable();
    }

    updateDisplay() {
        this.contributors.forEach(c => { c.element.style.display = 'none'; });

        if (this.filteredContributors.length > 0) {
            this.filteredContributors.forEach(c => { c.element.style.display = ''; });
            this.hideNoResults();
        } else {
            this.showNoResults();
        }
    }

    applyTableFilters() {
        if (!this.tableBody) return;

        const rows = this.tableBody.querySelectorAll('.contributor-table-row');

        rows.forEach(row => {
            if (row.dataset.pinned) {
                row.style.display = '';
                return;
            }

            const login = (row.dataset.login || '').toLowerCase();
            const thematics = (row.dataset.thematics || '').split(' ').filter(Boolean);

            const thematicMatch = this.activeThematicFilters.size === 0
                || thematics.some(t => this.activeThematicFilters.has(t));

            const searchMatch = !this.searchQuery || login.includes(this.searchQuery);

            row.style.display = (thematicMatch && searchMatch) ? '' : 'none';
        });
    }

    sortTable() {
        if (!this.tableBody) return;

        const pinnedRows = Array.from(
            this.tableBody.querySelectorAll('.contributor-table-row[data-pinned]')
        );
        const visibleRows = Array.from(
            this.tableBody.querySelectorAll('.contributor-table-row:not([data-pinned])')
        ).filter(r => r.style.display !== 'none');
        const hiddenRows = Array.from(
            this.tableBody.querySelectorAll('.contributor-table-row:not([data-pinned])')
        ).filter(r => r.style.display === 'none');

        const col = this.sortCol;
        const dir = this.sortDir;

        visibleRows.sort((a, b) => {
            let aVal = a.dataset[col] || '';
            let bVal = b.dataset[col] || '';

            if (col === 'login') {
                return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
            return dir === 'asc' ? aVal - bVal : bVal - aVal;
        });

        [...pinnedRows, ...visibleRows, ...hiddenRows].forEach(row => {
            this.tableBody.appendChild(row);
        });

        this.updateSortIcons();
    }

    updateSortIcons() {
        this.sortableHeaders.forEach(th => {
            const icon = th.querySelector('.sort-icon i');
            if (!icon) return;
            icon.className = 'fas fa-sort';
            if (th.dataset.col === this.sortCol) {
                icon.className = this.sortDir === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
        });
    }

    updateStats() {
        if (this.statsShowing) this.statsShowing.textContent = this.filteredContributors.length;
        if (this.statsTotal) this.statsTotal.textContent = this.contributors.length;
    }

    showNoResults() {
        if (this.noResultsElement) this.noResultsElement.style.display = 'block';
    }

    hideNoResults() {
        if (this.noResultsElement) this.noResultsElement.style.display = 'none';
    }

    resetFilters() {
        if (this.searchInput) this.searchInput.value = '';
        this.searchQuery = '';
        this.activeThematicFilters.clear();
        this.filterButtons.forEach(btn => btn.classList.remove('is-active'));
        this.applyFilters();
        this.updateURL();

        const filterSection = document.querySelector('.contributors-filter-section');
        if (filterSection) filterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.contributor-card.individual')) {
        new ContributorsFilter();
    }
});
