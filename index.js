const container = document.getElementById('gridContainer');
const sidebar = document.getElementById('sidebar')
const firstType = document.getElementsByClassName('type-btn')[0]
const typeButtons = document.querySelectorAll('.type-btn')
const resetBtn = document.getElementById('reset');
let currentMode = 'baseline';

import dataset from './data.json' with { type: 'json'}

const properties = ["Esri", "Analysis", "Records", "Services", "Cloud", "Share", "Display"];

properties.forEach(prop => {
    const btn = document.createElement('button');
    btn.id = prop.replaceAll(' ', '')
    btn.classList.add('control-btn', 'metric-btn');
    btn.textContent = prop;
    btn.onclick = () => toggleMetricFilter(prop, btn);
    firstType.before(btn);
});

typeButtons.forEach(btn => {
    btn.onclick = () => {
        animateLayout(() => {
            document.querySelectorAll('.card').forEach((card, idx) => {
                const dataRecord = dataset[idx];
                const type = dataRecord.Type
                if (type === btn.id && card.classList.contains('selected')) {
                    card.classList.toggle('shrink');
                    card.classList.toggle('filtered');
                    resetBtn.classList.remove('active')
                }
            });
        })
        btn.classList.toggle(btn.id)
    }
})


// Generate elements dynamically
for (const data of dataset) {
    const card = document.createElement('div');
    card.classList.add('card', 'selected');
    container.appendChild(card);

    const innerCard = document.createElement('div');
    innerCard.classList.add('flip-card-inner')
    card.appendChild(innerCard)

    const frontCard = document.createElement('div');
    frontCard.classList.add('flip-card-front', data.Type)
    frontCard.textContent = data.Name;
    innerCard.appendChild(frontCard)

    const backCard = document.createElement('div');
    backCard.classList.add('flip-card-back')
    backCard.textContent = data.Description
    innerCard.appendChild(backCard)

    card.onclick = () => {
        if (!card.classList.contains('shrink')) {
            card.classList.toggle('flipped');
        }
    };
}

// Get a live-updating reference list of elements
const getCards = () => document.querySelectorAll('.card');
getCards().forEach(card => {
    card.addEventListener('transitionend', (e) => {
        if (e.propertyName === 'transform') {
            card.classList.remove('animating');
            if (card.classList.contains('shrink')) {
                card.style.cssText = '';
            }
        }
    });
});

function calculateGrid() {
    const cardsList = getCards();

    if (currentMode === 'baseline') {
        // Determine a standard grid layout square template based on baseline element pool size
        const baseCols = Math.floor(Math.sqrt(cardsList.length) / 2) * 2; // Ensures even number of cols, b/c cards are 2x cols wide
        const baseRows = Math.ceil(cardsList.length / (baseCols / 2)); // Extra rows in card ratio causes sub-optimal packing
        container.style.setProperty('--grid-cols', baseCols);
        container.style.setProperty('--grid-rows', baseRows);
        return;
    }

    const containerW = container.clientWidth - 60;
    const containerH = container.clientHeight - 60;

    let totalRequiredTrackSlots = 0;

    // Dynamically scan the remaining items to calculate the slot footprint aggregate
    cardsList.forEach(card => {
        if (card.classList.contains('shrink')) return; // Ignore completely

        if (card.classList.contains('grow-rate-3')) totalRequiredTrackSlots += 3;
        else if (card.classList.contains('grow-rate-2')) totalRequiredTrackSlots += 2;
        else totalRequiredTrackSlots += 1;
    });

    // Prevent dividing by zero if everything is hidden
    if (totalRequiredTrackSlots === 0) return;

    // Generate an optimized aspect-ratio matrix dynamically tailored to the container size
    const cols = Math.ceil(Math.sqrt(totalRequiredTrackSlots * (containerW / containerH * 1.8)));
    const rows = Math.ceil(totalRequiredTrackSlots / cols);

    container.style.setProperty('--grid-cols', cols);
    container.style.setProperty('--grid-rows', rows);
}

function animateLayout(updateFunction) {
    const rects = new Map();
    const cardsList = getCards();

    // 1. Instantly strip all inline styles, transitions, and tracking classes
    cardsList.forEach(card => {
        card.classList.remove('animating');
        card.style.cssText = ''; // Clears transform, fixed positioning, opacity, etc.
    });

    // 2. Force a browser reflow so everything snaps to its clean layout state
    void container.offsetHeight;

    // 3. Now it is 100% safe to record the clean baseline coordinates
    cardsList.forEach(card => {
        rects.set(card, card.getBoundingClientRect());
    });

    // 4. Update the layout constraints

    updateFunction();

    cardsList.forEach(card => {
        const first = rects.get(card);
        const last = card.getBoundingClientRect();
        const wasHidden = first.width === 0;
        const isHiddenNow = card.classList.contains('shrink');

        // Scenario A: Card was hidden and stays hidden. Skip entirely.
        if (wasHidden && isHiddenNow) {
            return;
        }

        if (card.classList.contains('shrink')) {
            // Temporarily override display: none and lock it to its starting position
            card.style.display = 'flex';
            card.style.position = 'fixed';
            card.style.transformOrigin = 'top left'
            card.style.top = `${first.top}px`;
            card.style.left = `${first.left}px`;
            card.style.width = `${first.width}px`;
            card.style.height = `${first.height}px`;
            card.style.transform = 'scale(1)';
            card.style.opacity = '1';

            // Trigger the scale down transition on the next frames
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    card.classList.add('animating');
                    card.style.transform = 'scale(0)';
                    card.style.opacity = '0';
                });
            });
            return;
        }

        const isReturning = first.width === 0;
        const deltaX = isReturning ? 0 : first.left - last.left;
        const deltaY = isReturning ? 0 : first.top - last.top;
        const deltaW = last.width === 0 ? 1 : first.width / last.width;
        const deltaH = last.height === 0 ? 1 : first.height / last.height;

        card.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
        card.style.transformOrigin = 'top left';
        card.style.opacity = first.width === 0 ? '0' : '1';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.classList.add('animating');
                card.style.transform = 'none';
                card.style.opacity = '1';
            });
        });
    });
}

// Initialize layout constraints on load
calculateGrid();

function removeActive() {
    const currentActive = sidebar.querySelector('.control-btn.active')
    if (currentActive) {
        currentActive.classList.remove('active')
    }

}

sidebar.addEventListener('click', (event) => {
    const clickedButton = event.target.closest('.control-btn');
    if (!clickedButton || clickedButton.classList.contains('type-btn')) return;
    removeActive()
    clickedButton.classList.add('active')
})

resetBtn.addEventListener('click', () => {
    currentMode = 'baseline';
    typeButtons.forEach(btn => {
        btn.classList.add(btn.id)
    })
    animateLayout(() => {
        getCards().forEach((card, idx) => {
            card.style.transform = '';
            card.style.opacity = '1';
            card.classList.remove('shrink', 'grow-rate-1', 'grow-rate-2', 'grow-rate-3', 'flipped');
            card.classList.add('selected')
            const backCard = card.querySelector('.flip-card-back')
            backCard.textContent = dataset[idx]["Description"]
        });
        removeActive()
        calculateGrid();
    });
});

function toggleMetricFilter(property, activeBtn) {
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.classList.remove('active')
        btn.classList.add(btn.id) // Resets the storage type filter, temp fix until can persist filter across metric selections
    })
    activeBtn.classList.add('active');
    animateLayout(() => {
        document.querySelectorAll('.card').forEach((card, idx) => {
            const dataRecord = dataset[idx];
            const propMetrics = dataRecord[property];
            const score = propMetrics ? propMetrics.score : 0;
            const backCard = card.querySelector('.flip-card-back')

            card.classList.remove('shrink', 'grow-rate-1', 'grow-rate-2', 'grow-rate-3');

            if (score === 0) {
                card.classList.add('shrink');
                card.classList.remove('selected');
            } else {
                card.classList.add(`grow-rate-${score}`);
                card.classList.add('selected');
                backCard.textContent = propMetrics.explanation
            }
        });
    })
}

window.addEventListener('resize', calculateGrid);