localStorage.removeItem('file-ts');
localStorage.removeItem('link');

function registerEventsOnList(list) {
    list.setAttribute('data-id', list.id);
    list.addEventListener('dragover', e => {
        e.preventDefault();
        let draggingCard = document.querySelector('.dragging');
        let cardAfterDraggingCard = getCardAfterDraggingCard(list, e.clientY);
        if (cardAfterDraggingCard) {
            if (draggingCard instanceof Node) {
                cardAfterDraggingCard.parentNode.insertBefore(draggingCard, cardAfterDraggingCard);
            }
        } else {
            if (draggingCard instanceof Node) {
                list.appendChild(draggingCard);
            }
        }
    });
    list.addEventListener('drop', e => {
        let draggedCard = document.querySelector('.dragging');
        if (!draggedCard) {
            return;
        }
        let listId = e.currentTarget.getAttribute('data-id');
        let postPosition = [...e.currentTarget.querySelectorAll('.card')].indexOf(e.currentTarget.querySelector('.dragging'));

        fetch('/api/post/move/' + JSON.parse(localStorage.getItem('alumet'))._id + '/' + listId + '/' + draggedCard.dataset.id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                position: postPosition,
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    return toast({
                        title: 'Erreur',
                        message: data.error,
                        type: 'error',
                    });
                }
            });
    });
}

function getCardAfterDraggingCard(list, yDraggingCard) {
    let listCards = [...list.querySelectorAll('.card:not(.dragging)')];

    return listCards.reduce(
        (closestCard, nextCard) => {
            let nextCardRect = nextCard.getBoundingClientRect();
            let offset = yDraggingCard - nextCardRect.top - nextCardRect.height / 2;

            if (offset < 0 && offset > closestCard.offset) {
                return { offset, element: nextCard };
            } else {
                return closestCard;
            }
        },
        { offset: Number.NEGATIVE_INFINITY }
    ).element;
}

function registerEventsOnCard(card) {
    card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', e => {
        card.classList.remove('dragging');
    });
}

document.querySelector('.drop-box').addEventListener('click', e => {
    if (e.target.classList.contains('drop-box')) {
        navbar('loadfile');
    }
});

const editor = document.getElementById('editor');
let oldLink = null;
editor.addEventListener('input', function () {
    const text = editor.textContent;
    const linkRegex = /(https?:\/\/[^\s]+\.[a-z]{2,}\S*)/gi;
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
        const link = match[1];
        if (link !== oldLink) {
            let x = editor.innerHTML;
            x = x.replace(/&amp;/g, '&');
            editor.innerHTML = x = x.replace(link, '');
            handleLink(link);
        }
        oldLink = link;
    }
});

editor.addEventListener('paste', function (event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            event.preventDefault();
            navbar('loadfile');
            return;
        }
    }
});

function makeBold() {
    document.execCommand('bold');
    if (document.getElementById('bold').isToggled) {
        document.getElementById('bold').isToggled = false;
        document.getElementById('bold').classList.remove('active-effect');
    } else {
        document.getElementById('bold').isToggled = true;
        document.getElementById('bold').classList.add('active-effect');
    }
}

function makeItalic() {
    document.execCommand('italic');
    if (document.getElementById('italic').isToggled) {
        document.getElementById('italic').isToggled = false;
        document.getElementById('bold').classList.remove('active-effect');
    } else {
        document.getElementById('italic').isToggled = true;
        document.getElementById('bold').classList.add('active-effect');
    }
}

function doUnderline() {
    document.execCommand('underline');
    if (document.getElementById('underline').isToggled) {
        document.getElementById('underline').isToggled = false;
        document.getElementById('bold').classList.remove('active-effect');
    } else {
        document.getElementById('underline').isToggled = true;
        document.getElementById('bold').classList.add('active-effect');
    }
}

function handleLink(link) {
    document.querySelector('.link-preview').classList.add('active-link-loading', 'active-link-preview');
    fetch('/preview/meta?url=' + link)
        .then(res => res.json())
        .then(data => {
            document.getElementById('preview-title').innerText = data.title || data['og:title'] || getDomainFromUrl(link);
            document.querySelector('.link-preview').style.backgroundImage = `url(${data.image || data['og:image'] || ''})`;
            document.getElementById('preview-link').innerText = data.url || link;
            document.querySelector('.link-preview').classList.remove('active-link-loading');
            localStorage.setItem('link', link);
        });
}

function removeLink() {
    document.querySelector('.link-preview').classList.remove('active-link-preview');
    oldLink = null;
    localStorage.removeItem('link');
}

document.getElementById('latexInput').addEventListener('input', e => {
    const latex = e.currentTarget.value;
    const latexPreview = document.getElementById('latexPreview');
    latexPreview.src = `https://latex.codecogs.com/svg.latex?${latex}`;
});

function insertLatex() {
    const latex = document.getElementById('latexInput').value;
    const latexBlock = document.createElement('latex');
    latexBlock.setAttribute('contenteditable', false);
    latexBlock.innerText = latex;
    document.getElementById('editor').appendChild(latexBlock);
    navbar('post');
}

function getDomainFromUrl(url) {
    const a = document.createElement('a');
    a.href = url;
    return a.hostname;
}

function createFileElement(file) {
    const div = document.createElement('div');
    div.dataset.id = file._id;
    div.dataset.name = file.displayname;
    div.dataset.ext = file.mimetype;
    div.dataset.size = (file.filesize / 1024 / 1024).toFixed(2) + ' Mo';
    div.dataset.date = file.date.split('T')[0];
    div.setAttribute('onclick', `chooseFile('${file._id}')`);
    div.classList.add('file-item');
    const subDiv = document.createElement('div');
    subDiv.classList.add('file-name');
    const img = document.createElement('img');
    let imgRef = fileIconReference[file.mimetype];
    if (imgRef) {
        img.src = `${fileIconReference[file.mimetype]}`;
    } else {
        img.src = '../assets/files-icons/unknow.png';
        imgRef = '../assets/files-icons/unknow.png';
    }
    div.dataset.imgRef = imgRef;
    img.alt = 'file icon';
    const h4 = document.createElement('h4');
    const span = document.createElement('span');
    span.innerText = file.displayname.split('.')[0];
    h4.appendChild(span);
    h4.innerText += `.${file.displayname.split('.').pop()}`;
    subDiv.appendChild(img);
    subDiv.appendChild(h4);
    div.appendChild(subDiv);
    const sizeH4 = document.createElement('h4');
    sizeH4.innerText = (file.filesize / 1024 / 1024).toFixed(2) + ' Mo';
    div.appendChild(sizeH4);
    const dateH4 = document.createElement('h4');
    dateH4.innerText = file.date.split('T')[0];
    div.appendChild(dateH4);
    return div;
}

const folderSelection = document.getElementById('folder-selection');

folderSelection.addEventListener('change', e => {
    loadFolder(e.currentTarget.value);
});

function commentPost(id) {
    return toast({
        title: 'Fonctionnalitée indisponible',
        message: 'Cette fonctionnalitée rencontre actuellement des problèmes.',
        type: 'warning',
    });
}

function loadFiles() {
    fetch('/cdn/folder/list', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                if (data.length === 0) {
                    document.querySelector('.files-header').style.display = 'none';
                    document.querySelector('.files-items').style.display = 'none';
                    document.getElementById('folder-selection').style.display = 'none';
                    return;
                }
            }
            data.forEach(addFolder);
            localStorage.setItem('currentFolder', data[0]._id);
            loadFolder(localStorage.getItem('currentFolder'));
        });
}

function addFolder(folder) {
    folderSelection.appendChild(createOption(folder));
}

function createOption(folder) {
    const option = document.createElement('option');
    option.value = folder._id;
    option.innerText = folder.name;
    return option;
}

document.getElementById('search-bar').addEventListener('input', e => {
    const search = e.currentTarget.value.toLowerCase();
    const allFiles = document.querySelectorAll('.file-item');
    allFiles.forEach(file => {
        const fileName = file.dataset.name.toLowerCase();
        if (fileName.includes(search)) {
            file.style.display = 'flex';
        } else {
            file.style.display = 'none';
        }
    });
});

function promptLeave() {
    createPrompt({
        head: "Quitter l'alumet",
        desc: 'Êtes-vous sûr de vouloir quitter cet alumet ? Vous ne pourrez plus y accéder.',
        action: 'leaveAlumet()',
    });
}

function leaveAlumet() {
    fetch('/portal/leave/' + alumet._id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(res => res.json())
        .then(data => {
            document.querySelector('.prompt-popup').classList.remove('active-popup');
            if (data.error) {
                return toast({ title: 'Erreur', message: data.error, type: 'error' });
            }
            window.location.href = '/dashboard';
        });
}

function addCollaborators() {
    document.querySelector('.user-popup').classList.add('active-popup');
}

function confirmCollaborators() {
    fetch('/alumet/collaborators/' + alumet._id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collaborators: participants }),
    })
        .then(res => res.json())
        .then(data => {
            document.querySelector('.user-popup').classList.remove('active-popup');
            if (data.error) {
                return toast({ title: 'Erreur', message: data.error, type: 'error' });
            }
            toast({ title: 'Succès', message: 'Les invitations ont bien été envoyées', type: 'success' });
        });
}

function addParticipants() {
    createPrompt({
        head: 'Ajouter des participants',
        desc: 'Coller le lien ci dessous et partager le pour inviter des participants à votre alumet.',
        placeholder: "Lien d'invitation",
        disabled: true,
        action: 'copyLink()',
    });
    document.getElementById('prompt-input').value = window.location.host + '/portal/' + alumet._id + '?code=' + alumet.code;
}

function copyLink() {
    const promptInput = document.getElementById('prompt-input');
    document.querySelector('.prompt-popup').classList.remove('active-popup');
    promptInput.select();
    navigator.clipboard
        .writeText(promptInput.value)
        .then(() => {
            toast({ title: 'Succès', message: 'Le lien a bien été copié', type: 'success' });
        })
        .catch(err => {
            console.error('Failed to copy link: ', err);
            toast({ title: 'Erreur', message: 'Impossible de copier le lien', type: 'error' });
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
