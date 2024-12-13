const setElementDisplay = (elementId, displayStyle) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = displayStyle;
    }
};

export const hideElement = (elementId) => {
    setElementDisplay(elementId, 'none');
};

export const showElement = (elementId) => {
    setElementDisplay(elementId, 'flex');
};
