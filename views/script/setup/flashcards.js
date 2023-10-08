function createFlashcards() {
    document.querySelector('.full-screen').style.display = 'flex';
    let name = document.getElementById('flashcards-name').value;
    let description = document.getElementById('flashcards-description').value;
    let selectSubject = document.getElementById('flashcards-subject').options[document.getElementById('flashcards-subject').selectedIndex].value;
    let isPublic = document.getElementById('flashcards-public').checked;
    fetch('/flashcards/set', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name,
            description,
            subject: selectSubject,
            isPublic,
            collaborators: participants,
        }),
    }).then(res => {
        res.json().then(data => {
            if (data.error) {
                document.querySelector('.full-screen').style.display = 'none';
                toast({ title: 'Erreur', message: data.error, type: 'error', duration: 7500 });
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                toast({ title: 'Succès', message: "L'alumet a bien été créé !", type: 'success', duration: 2500 });
                setTimeout(() => {
                    window.location.href = `/dashboard`;
                }, 2500);
            }
        });
    });
}

const userPrompt = document.querySelector('#user-prompt');
const debounceDelay = 500;
let debounceTimeoutId;

userPrompt.addEventListener('input', e => {
    clearTimeout(debounceTimeoutId);
    debounceTimeoutId = setTimeout(() => {
        const query = e.target.value;
        const type = 'user';
        searchUsers(query, type);
    }, debounceDelay);
});