const path = window.location.pathname;
const parts = path.split('/');
const id = parts[parts.length - 1];
let alumet = {};

function getContent() {
    fetch('/alumet/' + id + '/content')
        .then(response => response.json())
        .then(data => {
            alumet = data;
            localStorage.setItem('alumet', JSON.stringify(data));
            document.querySelector('body').style.backgroundImage = `url(/cdn/u/${data.background})`;
            data.walls.forEach(wall => {
                const list = createInList(wall.title, wall.postAuthorized, wall._id);
                const draggingContainer = list.querySelector('.draggingContainer');
                wall.posts.forEach(post => {
                    const card = createTaskList(post);
                    draggingContainer.appendChild(card);
                });
                const button = document.getElementById('wall');
                const parent = button.parentNode;
                parent.insertBefore(list, button);
            });
            if (data.user_infos) {
                loadFiles();
            }
            document.querySelector('body > section').style.display = 'none';
        });
}

function getPostData(id, replace) {
    for (let wall of alumet.walls) {
        let post = wall.posts.find(post => post._id === id);
        if (post) {
            if (replace) {
                const wallIndex = alumet.walls.findIndex(wall => wall._id === post.wallId);
                const postIndex = alumet.walls[wallIndex].posts.findIndex(p => p._id === id);
                alumet.walls[wallIndex].posts[postIndex] = replace;
            }
            return post;
        }
    }
    if (replace) {
        const wallId = replace.wallId;
        const wallIndex = alumet.walls.findIndex(wall => wall._id === wallId);
        if (wallIndex !== -1) {
            alumet.walls[wallIndex].posts.push(replace);
            return replace;
        }
    }
    return null;
}

function patchWall(position) {
    navbar('loadingRessources');
    fetch('/api/wall/' + JSON.parse(localStorage.getItem('alumet'))._id + '/' + wallToEdit + '/move?direction=' + position, {
        method: 'PATCH',
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                return toast({
                    title: 'Erreur',
                    message: data.error,
                    type: 'error',
                    duration: 5000,
                });
            }
            setTimeout(() => {
                navbar('home');
            }, 1000);
            const wall = document.querySelector(`.list[data-id="${data._id}"]`);
            wall.dataset.position = data.position;
        });
}

function getWallData(id, replace) {
    const wallIndex = alumet.walls.findIndex(wall => wall._id === id);
    if (wallIndex !== -1) {
        const wall = alumet.walls[wallIndex];
        if (replace) {
            alumet.walls[wallIndex] = replace;
        }
        return wall;
    }
    if (replace) {
        replace.posts = [];
        alumet.walls.push(replace);
        return replace;
    }
    return null;
}
let wallToEdit;
async function editWall(id) {
    wallToEdit = id;
    let wallData = await getWallData(id);
    if (!wallData) {
        toast({
            title: 'Erreur',
            message: 'Impossible de trouver le tableau',
            type: 'error',
            duration: 5000,
        });
    }
    document.getElementById('wallTitle').value = wallData.title;
    document.getElementById('postAuthorized').checked = wallData.postAuthorized;
    navbar('wall');
    document.querySelector('.wall').classList.add('editing');
}

function clearWall() {
    document.getElementById('wallTitle').value = '';
    document.getElementById('postAuthorized').checked = false;
    document.querySelector('.wall').classList.remove('editing');
}

let postToEdit;
async function editPost(id) {
    let postData = await getPostData(id);
    if (!postData) {
        toast({
            title: 'Erreur',
            message: 'Impossible de trouver la publication',
            type: 'error',
            duration: 5000,
        });
    }
    postToEdit = postData._id;
    localStorage.setItem('currentItem', postData.wallId);
    document.getElementById('postTitle').value = postData.title;
    document.getElementById('editor').innerHTML = postData.content;
    document.getElementById('postCommentAuthorized').checked = postData.commentAuthorized;
    document.getElementById('administatorsAuthorized').checked = postData.adminsOnly;
    if (postData.file) {
        localStorage.setItem('file-ts', postData.file._id);
        document.querySelector('.file-sending-infos > h3').innerText = postData.file.displayname;
        document.querySelector('.drop-box').classList.add('ready-to-send');
    }
    if (postData.link) {
        localStorage.setItem('link', postData.link.url);
        document.querySelector('.link-preview').classList.add('active-link-preview');
        document.getElementById('preview-title').innerText = postData.link.title;
        document.getElementById('preview-link').innerText = postData.link.description;
        document.querySelector('.link-preview').style.backgroundImage = `url(${postData.link.image})`;
    }
    if (postData.postDate) {
        document.getElementById('publicationDate').checked = true;
        document.querySelector('.date').classList.add('active-date');
        const date = new Date(postData.postDate);
        const dateInput = document.getElementById('dateFormat');
        const timeInput = document.getElementById('timeFormat');
        dateInput.value = date.toLocaleDateString('fr-CA');
        timeInput.value = date.toLocaleTimeString('fr-CA');
    }
    navbar('post');
    document.querySelector('.post-buttons > .reded').style.display = 'flex';
}

function createTaskList(post) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.draggable = true;
    card.dataset.position = post.position;
    card.dataset.id = post._id;

    author = document.createElement('div');
    author.classList.add('author');
    author.textContent = post.owner.name + ' ' + post.owner.lastname;
    if (post.owner.isCertified) {
        const certified = document.createElement('img');
        certified.src = `/assets/global/${post.owner.accountType}-certified.svg`;
        certified.title = 'Compte ' + post.owner.accountType + ' certifié';
        certified.classList.add('certified');
        certified.setAttribute('draggable', false);
        author.appendChild(certified);
    }
    if (alumet.admin || alumet.user_infos?.id === post.owner._id) {
        const editButton = document.createElement('img');
        editButton.classList.add('edit');
        editButton.src = '/assets/global/edit.svg';
        editButton.setAttribute('onclick', `editPost("${post._id}")`);
        author.appendChild(editButton);
    }
    card.appendChild(author);

    if (post.file) {
        const filePreview = document.createElement('div');
        filePreview.setAttribute('onclick', `window.open("/viewer/${post.file._id}")`);
        filePreview.style.backgroundImage = `url("/preview?id=${post.file._id}")`;
        filePreview.classList.add('post-rich-content');
        const filePreviewTitle = document.createElement('h2');
        filePreviewTitle.textContent = post.file.displayname;
        const filePreviewExt = document.createElement('div');
        filePreviewExt.classList.add('ext');
        filePreviewExt.textContent = post.file.mimetype.toUpperCase();
        const gradient = document.createElement('div');
        gradient.classList.add('reader-gradient');
        filePreview.appendChild(filePreviewTitle);
        filePreview.appendChild(filePreviewExt);
        filePreview.appendChild(gradient);
        card.appendChild(filePreview);
    }
    if (post.link) {
        const linkPreview = document.createElement('div');
        if (post.link.image) {
            linkPreview.style.backgroundImage = `url(${post.link.image})`;
        }
        linkPreview.classList.add('post-rich-content');
        const linkPreviewTitle = document.createElement('h2');
        linkPreviewTitle.textContent = post.link.title;
        const linkPreviewDescription = document.createElement('p');
        linkPreviewDescription.textContent = post.link.description;
        const gradient = document.createElement('div');
        gradient.classList.add('reader-gradient');
        linkPreview.appendChild(linkPreviewTitle);
        linkPreview.appendChild(linkPreviewDescription);
        linkPreview.appendChild(gradient);
        card.appendChild(linkPreview);
    }
    if (post.title) {
        const cardTitle = document.createElement('div');
        cardTitle.classList.add('title');
        cardTitle.textContent = post.title;
        card.appendChild(cardTitle);
    }
    if (post.content) {
        const cardDescription = document.createElement('div');
        cardDescription.classList.add('description');
        const latexRegex = /<latex>(.*?)<\/latex>/g;
        const matches = post.content.matchAll(latexRegex);
        let content = post.content;
        for (const match of matches) {
            let imgLatex = document.createElement('img');
            imgLatex.src = `https://latex.codecogs.com/svg.latex?\\dpi{300}&space;${match[1]}`;
            imgLatex.alt = 'LaTeX equation';
            imgLatex.classList.add('latexImg');
            console.log(imgLatex);
            content = content.replace(match[0], imgLatex.outerHTML);
        }

        cardDescription.innerHTML = content;
        card.appendChild(cardDescription);
    }

    if (!navigator.userAgent.includes('Mobile')) {
        registerEventsOnCard(card);
    }
    return card;
}

function createInList(title, postAuthorized, id) {
    const list = document.createElement('div');
    list.dataset.id = id;
    list.classList.add('list');
    const titleEl = document.createElement('div');
    titleEl.classList.add('titleList');
    let text = document.createElement('h1');
    text.textContent = title;
    titleEl.appendChild(text);
    const draggingContainer = document.createElement('div');
    draggingContainer.classList.add('draggingContainer');
    draggingContainer.setAttribute('id', id);
    list.appendChild(titleEl);
    if (postAuthorized || alumet.admin) {
        const button = document.createElement('button');
        button.setAttribute('id', 'post');
        button.classList.add('add');
        button.textContent = 'Ajouter une publication';
        button.setAttribute('onclick', `navbar("post", "${id}", "post")`);
        list.appendChild(button);
    }
    if (alumet.admin) {
        const imgEdit = document.createElement('img');
        imgEdit.src = '/assets/global/edit.svg';
        imgEdit.classList.add('edit');
        imgEdit.setAttribute('onclick', `editWall("${id}")`);
        titleEl.appendChild(imgEdit);
    }
    list.appendChild(draggingContainer);
    if (!navigator.userAgent.includes('Mobile')) {
        registerEventsOnList(draggingContainer);
    }
    return list;
}

getContent();

function chooseFile(id) {
    const fileDiv = document.querySelector(`div[data-id="${id}"]`);
    document.querySelector('.file-sending-infos > h3').innerText = fileDiv.dataset.name;
    localStorage.setItem('file-ts', id);
    navbar('post');
    document.querySelector('.drop-box').classList.add('ready-to-send');
}

document.getElementById('load-post-file').addEventListener('click', () => {
    document.getElementById('post-file').click();
});

document.getElementById('post-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    localStorage.removeItem('file-ts');
    const formData = new FormData();
    formData.append('file', file);
    document.querySelector('.file-sending-infos > h3').innerText = file.name;
    navbar('post');
    document.querySelector('.drop-box').classList.add('ready-to-send');
});

document.getElementById('publicationDate').addEventListener('change', e => {
    document.querySelector('.date').classList.toggle('active-date');
});

function cancelSend() {
    localStorage.removeItem('file-ts');
    document.getElementById('post-file').value = '';
    document.querySelector('.ready-to-send').classList.remove('ready-to-send');
}

async function createPost() {
    let fileFromDevice = document.getElementById('post-file').files[0];
    let fileFromCloud = localStorage.getItem('file-ts');
    let title = document.getElementById('postTitle').value;
    let content = document.getElementById('editor').innerHTML;
    let commentAuthorized = document.getElementById('postCommentAuthorized').checked;
    let adminsOnly = document.getElementById('administatorsAuthorized').checked;
    let postDate = document.getElementById('dateFormat').value;
    let postTime = document.getElementById('timeFormat').value;
    let link = localStorage.getItem('link');

    if (!title && (!content || content === 'Ecrivez ici le contenu') && !fileFromDevice && !fileFromCloud && !link) {
        return toast({
            title: 'Erreur',
            message: "Vous n'avez pas spécifié de contenu pour cette publication",
            type: 'error',
            duration: 5000,
        });
    }

    navbar('loadingRessources');

    const body = {
        title,
        content,
        commentAuthorized,
        adminsOnly,
        link,
    };

    if (postToEdit) {
        body.postId = postToEdit;
    }

    if (document.getElementById('publicationDate').checked && postDate && postTime) {
        body.postDate = convertToISODate(postDate, postTime);
    }

    if (fileFromDevice) {
        const fileUrl = await uploadFile(fileFromDevice);
        body.file = fileUrl;
    } else if (fileFromCloud) {
        body.file = fileFromCloud;
    }

    try {
        const response = await fetch('/api/post/' + JSON.parse(localStorage.getItem('alumet'))._id + '/' + localStorage.getItem('currentItem'), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (data.error) {
            navbar('post');
            return toast({
                title: 'Erreur',
                message: data.error,
                type: 'error',
                duration: 5000,
            });
        }
        const newPost = createTaskList(data);
        if (postToEdit) {
            const post = document.querySelector(`.card[data-id="${postToEdit}"]`);
            post.parentNode.replaceChild(newPost, post);
            getPostData(data._id, data);
        } else {
            const list = document.getElementById(data.wallId);
            list.prepend(newPost);
            getPostData(data._id, data);
        }
        setTimeout(() => {
            navbar('home');
        }, 1000);
    } catch (error) {
        console.error(error);
    }
}

function deletePost() {
    navbar('loadingRessources');
    fetch('/api/post/' + JSON.parse(localStorage.getItem('alumet'))._id + '/' + postToEdit, {
        method: 'DELETE',
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                return toast({
                    title: 'Erreur',
                    message: data.error,
                    type: 'error',
                    duration: 5000,
                });
            }
            setTimeout(() => {
                const post = document.querySelector(`.card[data-id="${postToEdit}"]`);
                post.parentNode.removeChild(post);
                navbar('home');
            }, 1000);
        });
}

function deleteWall() {
    navbar('loadingRessources');
    fetch('/api/wall/' + JSON.parse(localStorage.getItem('alumet'))._id + '/' + wallToEdit, {
        method: 'DELETE',
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                return toast({
                    title: 'Erreur',
                    message: data.error,
                    type: 'error',
                    duration: 5000,
                });
            }
            setTimeout(() => {
                const wall = document.querySelector(`.list[data-id="${wallToEdit}"]`);
                wall.parentNode.removeChild(wall);
                navbar('home');
            }, 1000);
        });
}

function clearPost() {
    document.getElementById('postTitle').value = '';
    document.getElementById('editor').innerHTML = '';
    document.getElementById('post-file').value = '';
    document.getElementById('postCommentAuthorized').checked = false;
    document.getElementById('administatorsAuthorized').checked = false;
    document.getElementById('publicationDate').checked = false;
    document.querySelector('.date').classList.remove('active-date');
    document.querySelector('.drop-box').classList.remove('ready-to-send');
    oldLink = '';
    document.querySelector('.link-preview').classList.remove('active-link-preview');
    localStorage.removeItem('file-ts');
    localStorage.removeItem('link');
}

async function uploadFile(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        fetch('/cdn/upload/' + localStorage.getItem('currentFolder'), {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data.file._id);
                }
            })
            .catch(error => {
                reject(error);
            });
    });
}
function convertToISODate(dateString, timeString) {
    const date = new Date(`${dateString}T${timeString}:00`);
    const isoDate = date.toISOString();
    return isoDate;
}

function createWall() {
    let title = document.getElementById('wallTitle').value;
    let postAuthorized = document.getElementById('postAuthorized').checked;
    if (title.length < 1) {
        return toast({
            title: 'Erreur',
            message: 'Vous devez entrer un titre',
            type: 'error',
            duration: 5000,
        });
    }
    navbar('loadingRessources');
    fetch('/api/wall/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, postAuthorized, wallToEdit }),
    })
        .then(response => response.json())
        .then(data => {
            if (!data.title) {
                navbar('wall');
                return toast({
                    title: 'Erreur',
                    message: data.error,
                    type: 'error',
                    duration: 5000,
                });
            }

            if (wallToEdit) {
                const wall = document.querySelector(`.list[data-id="${data._id}"]`);
                wall.querySelector('h1').innerText = data.title;
            } else {
                const list = createInList(data.title, data.postAuthorized, data._id);
                const button = document.getElementById('wall');
                const parent = button.parentNode;
                parent.insertBefore(list, button);
            }
            getWallData(data._id, data);
            setTimeout(() => {
                navbar('home');
            }, 1000);
        });
}
