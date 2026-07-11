function prepareTyping(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT
    );

    let node;

    while ((node = walker.nextNode())) {
        textNodes.push({
            node: node,
            text: node.textContent
        });

        node.textContent = "";
    }

    return textNodes;
}

function typeEffect(textNodes, speed, callback) {
    let nodeIndex = 0;
    let characterIndex = 0;

    const timer = setInterval(function () {
        if (nodeIndex >= textNodes.length) {
            clearInterval(timer);

            if (callback) {
                callback();
            }

            return;
        }

        const currentNode = textNodes[nodeIndex];

        if (characterIndex < currentNode.text.length) {
            currentNode.node.textContent += currentNode.text.charAt(characterIndex);
            characterIndex++;
        } else {
            nodeIndex++;
            characterIndex = 0;
        }
    }, speed);
}

function typeParagraphs(paragraphs, index, speed) {
    if (index >= paragraphs.length) {
        return;
    }

    typeEffect(paragraphs[index], speed, function () {
        typeParagraphs(paragraphs, index + 1, speed);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const loadingPage = document.getElementById("loadingPage");
    const portfolioPage = document.getElementById("portfolioPage");
    const heading = document.querySelector("#centeralign h5");
    const aboutText = document.querySelector(".about-text");
    const paragraphElements = Array.from(
        document.querySelectorAll(".about-text p")
    );

    const headingNodes = prepareTyping(heading);

    const paragraphNodes = paragraphElements.map(function (paragraph) {
        return prepareTyping(paragraph);
    });

    setTimeout(function () {
        loadingPage.classList.add("hide");
        portfolioPage.classList.add("show");

        typeEffect(headingNodes, 95, function () {
            aboutText.style.display = "block";
            typeParagraphs(paragraphNodes, 0, 105);
        });
    }, 3000);
});
