function typeEffect(element, speed, callback) {
    const text = element.textContent.trim().replace(/\s+/g, " ");

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

document.addEventListener("DOMContentLoaded", function () {
    const loadingPage = document.getElementById("loadingPage");
    const portfolioPage = document.getElementById("portfolioPage");
    const heading = document.querySelector("#centeralign h3");
    const paragraph = document.querySelector("#centeralign p");

    const headingText = heading.textContent.trim();
    const paragraphText = paragraph.textContent.trim().replace(/\s+/g, " ");

    heading.textContent = headingText;
    paragraph.textContent = paragraphText;

    setTimeout(function () {
        loadingPage.classList.add("hide");
        portfolioPage.classList.add("show");

        typeEffect(heading, 110, function () {
            paragraph.style.display = "block";
            typeEffect(paragraph, 120);
        });
    }, 3000);
});
