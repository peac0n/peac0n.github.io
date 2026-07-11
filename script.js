function typeEffect(element, text, speed, callback) {
    element.textContent = "";

    let index = 0;

    const timer = setInterval(function () {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(timer);

            if (callback) {
                callback();
            }
        }
    }, speed);
}

function typeParagraphs(paragraphs, texts, index, speed) {
    if (index >= paragraphs.length) {
        return;
    }

    typeEffect(paragraphs[index], texts[index], speed, function () {
        typeParagraphs(paragraphs, texts, index + 1, speed);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const loadingPage = document.getElementById("loadingPage");
    const portfolioPage = document.getElementById("portfolioPage");
    const heading = document.querySelector("#centeralign h3");
    const aboutText = document.querySelector(".about-text");
    const paragraphs = Array.from(document.querySelectorAll(".about-text p"));

    const headingText = heading.textContent.trim();
    const paragraphTexts = paragraphs.map(function (paragraph) {
        return paragraph.textContent.trim();
    });

    heading.textContent = "";

    paragraphs.forEach(function (paragraph) {
        paragraph.textContent = "";
    });

    setTimeout(function () {
        loadingPage.classList.add("hide");
        portfolioPage.classList.add("show");

        typeEffect(heading, headingText, 95, function () {
            aboutText.style.display = "block";
            typeParagraphs(paragraphs, paragraphTexts, 0, 110);
        });
    }, 3000);
});
