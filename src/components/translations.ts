export type Language = 'English' | 'Русский';

export const translations = {
  English: {
    // Navigation
    home: 'Home',
    library: 'Library',
    settings: 'Settings',
    admin: 'Admin',
    
    // Auth
    login: 'Log In',
    logout: 'Log Out',
    signUp: 'Sign Up',
    username: 'Username',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    enterUsername: 'Enter your username',
    enterPassword: 'Enter your password',
    loginSubtitle: 'Enter your credentials to continue',
    registerSubtitle: 'Create your account',
    invalidCredentials: 'Invalid username or password',
    rememberMe: 'Remember me',
    dontHaveAccount: 'Don\'t have an account?',
    alreadyHaveAccount: 'Already have an account?',
    profile: 'Profile',
    // Register errors
    usernameTooShort: 'Username must be at least 2 characters',
    passwordTooShort: 'Password must be at least 3 characters',
    passwordsDontMatch: 'Passwords don\'t match',
    usernameExists: 'Username already exists',
    registrationSuccess: 'Registration successful! Redirecting to login...',
    
    // Library sections
    playlists: 'Playlists',
    artists: 'Artists',
    albums: 'Albums',
    recentlyPlayed: 'Recently Played',
    
    // Playlist/Track actions
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    previous: 'Previous',
    shuffle: 'Shuffle',
    repeat: 'Repeat',
    like: 'Like',
    unlike: 'Unlike',
    addToQueue: 'Add to queue',
    addToLiked: 'Add to Liked Songs',
    removeFromLiked: 'Remove from Liked Songs',
    goToArtist: 'Go to artist',
    goToAlbum: 'Go to album',
    
    // Player
    nowPlaying: 'Now Playing',
    queue: 'Queue',
    lyrics: 'Lyrics',
    noLyrics: 'No lyrics available',
    nextUp: 'Next Up',
    playingFrom: 'Playing from',
    
    // Search
    searchPlaceholder: 'What do you want to listen to?',
    searchForMusic: 'Search for music',
    noResults: 'No results found',
    tryDifferentSearch: 'Try searching for something else',
    all: 'All',
    tracks: 'Tracks',
    track: 'track',
    
    // Time
    min: 'min',
    sec: 'sec',
    
    // Greetings
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    
    // Sections
    madeForYou: 'Made For You',
    recommendedPlaylists: 'Recommended Playlists',
    showAll: 'Show all',
    
    // Settings
    settingsTitle: 'Settings',
    settingsSubtitle: 'Customize your Sip&Sound experience',
    
    // Settings sections
    playback: 'Playback',
    display: 'Display',
    languageAndRegion: 'Language & Region',
    
    // Playback settings
    crossfadeSongs: 'Crossfade songs',
    crossfadeDuration: 'Crossfade duration',
    gaplessPlayback: 'Gapless playback',
    normalizeVolume: 'Normalize volume',
    
    // Display settings
    enableAnimations: 'Interface animations',
    highContrastMode: 'High contrast mode',
    compactView: 'Compact view',
    
    // Language settings
    language: 'Language',
    region: 'Region',
    
    // About
    version: 'Version',
    madeWith: 'Made with',
    allRightsReserved: 'All rights reserved',
    
    // Quick access
    likedSongs: 'Liked Songs',
    yourPlaylist: 'Your playlist',
    
    // Artist view
    popularTracks: 'Popular Tracks',
    about: 'About',
    followers: 'followers',
    monthlyListeners: 'monthly listeners',
    
    // Keyboard shortcuts
    keyboardShortcuts: 'Keyboard Shortcuts',
    playbackControl: 'Playback Control',
    spaceToPlayPause: 'Play/Pause',
    nextTrack: 'Next track',
    previousTrack: 'Previous track',
    volumeUp: 'Volume up',
    volumeDown: 'Volume down',
    toggleMute: 'Toggle mute',
    navigation: 'Navigation',
    toggleQueue: 'Toggle queue',
    toggleFullscreen: 'Toggle fullscreen player',
    goHome: 'Go to home',
    goToLibrary: 'Go to library',
    goToSettings: 'Go to settings',
    general: 'General',
    toggleShuffle: 'Toggle shuffle',
    toggleRepeat: 'Toggle repeat',
    toggleLike: 'Like/Unlike current track',
    
    // Toast messages
    crossfadeEnabled: 'Crossfade enabled',
    crossfadeDisabled: 'Crossfade disabled',
    gaplessEnabled: 'Gapless playback enabled',
    gaplessDisabled: 'Gapless playback disabled',
    normalizeEnabled: 'Normalize volume enabled',
    normalizeDisabled: 'Normalize volume disabled',
    animationsEnabled: 'Animations enabled',
    animationsDisabled: 'Animations disabled',
    highContrastEnabled: 'High contrast mode enabled',
    highContrastDisabled: 'High contrast mode disabled',
    compactViewEnabled: 'Compact view enabled',
    compactViewDisabled: 'Compact view disabled',
    languageChanged: 'Language changed to',
    
    // Track added messages
    trackAdded: 'Added to Liked Songs',
    trackRemoved: 'Removed from Liked Songs',
    
    // Shuffle and repeat messages
    shuffleOn: 'Shuffle on',
    shuffleOff: 'Shuffle off',
    repeatOn: 'Repeat on',
    repeatOff: 'Repeat off',
    
    // Common words
    back: 'Back',
    songs: 'Songs',
    song: 'song',
    playlist: 'Playlist',
    album: 'Album',
    duration: 'Duration',
    title: 'Title',
    artist: 'Artist',
    and: 'and',
    more: 'more',
    
    // Empty states
    emptyQueue: 'Your queue is empty',
    emptyQueueDescription: 'Add songs to your queue to see them here',
    noTracksYet: 'No tracks yet',
    noTracksYetDescription: 'Start listening to see your recently played tracks',
    
    // Time references
    hoursAgo: 'hours ago',
    yesterday: 'Yesterday',
    daysAgo: 'days ago',
    
    // Library categories
    items: 'items',
    
    // Library view specific
    yourLibrary: 'Your Library',
    allYourMusicInOnePlace: 'All your music in one place',
    browse: 'Browse',
    likedSongsTitle: 'Liked Songs',
    yourPlaylists: 'Your Playlists',
    yourAlbums: 'Your Albums',
    yourArtists: 'Your Artists',
    recentlyPlayedTitle: 'Recently Played',
    
    // Artist view specific
    verifiedArtist: 'Verified Artist',
    following: 'Following',
    follow: 'Follow',
    unfollow: 'Unfollow',
    singlesAndEP: 'Singles & EP',
    singles: 'Singles',
    discography: 'Discography',
    discographyDescription: 'All albums and releases',
    topTracksDescription: 'Top tracks for the last month',
    moreOptions: 'More',
    likedTracks: 'Liked Tracks',
    youLiked: 'You liked',
    by: 'By',
    plays: 'Plays',
    
    // ShowAll view
    playlistsCount: 'playlists',
    
    // Artist view actions
    seeMore: 'See more',
    showLess: 'Show less',
    
    // Sidebar actions
    createPlaylist: 'Create Playlist',
    creatingPlaylist: 'Creating new playlist...',
    
    // Create Playlist View
    createPlaylistDescription: 'Create your own playlist and add your favorite songs',
    playlistCover: 'Playlist Cover',
    chooseCoverImage: 'Choose a cover image for your playlist',
    uploadImage: 'Upload Image',
    playlistName: 'Playlist Name',
    myPlaylist: 'My Playlist',
    playlistDescription: 'Description',
    addDescription: 'Add an optional description',
    cancel: 'Cancel',
    startAddingSongs: 'Start adding songs to your new playlist',
    addTracks: 'Add Tracks',
    searchTracks: 'Search for tracks to add',
    searchToAddTracks: 'Search for tracks to add to your playlist',
    added: 'added',
    
    // Playlist descriptions
    peacefulPianoDesc: 'Relax and indulge with beautiful piano pieces',
    deepFocusDesc: 'Keep calm and focus with ambient and post-rock music',
    jazzVibesDesc: 'The original chill instrumental beats playlist',
    chillHitsDesc: 'Kick back to the best new and recent chill hits',
    allOut2010sDesc: 'The biggest songs of the 2010s',
    natureSoundsDesc: 'Relax with calming sounds of nature',
    workoutBeatsDesc: 'High energy tracks to power your workout',
    partyMixDesc: 'Best party hits to get the celebration started',
    
    // Profile View
    manageYourProfile: 'Manage your profile settings',
    clickCameraToUpload: 'Click the camera icon to upload a new photo',
    avatarUrlOptional: 'Avatar URL (optional)',
    saveChanges: 'Save Changes',
    profileUpdatedSuccess: 'Profile updated successfully',
    profileUpdatedError: 'Failed to update profile',
    usernameCannotBeEmpty: 'Username cannot be empty',
    accountActions: 'Account Actions',
    signOutOfYourAccount: 'Sign out of your account',
    
    // Admin Panel
    adminPanel: 'Admin Panel',
    manageTracksPlaylistsStats: 'Manage tracks, playlists and statistics',
    stats: 'Statistics',
    uploadTrack: 'Upload Track',
    trackTitle: 'Track Title',
    enterTrackTitle: 'Enter track title',
    selectArtist: 'Select an artist',
    artistNotSelected: 'Artist not selected',
    update: 'Update',
    startTypingArtistName: 'Start typing artist name',
    loadingArtists: 'Loading artists...',
    nothingFound: 'Nothing found',
    searchAlbumOrNewName: 'Search album or new name',
    albumNotSelected: 'Album not selected (will create single with track name)',
    selectArtistFirst: 'Select artist first',
    genre: 'Genre',
    musicGenre: 'Music genre',
    durationSeconds: 'Duration (seconds)',
    audioFile: 'Audio File',
    leaveEmptyToUseExisting: 'Leave empty to use existing file',
    coverImage: 'Cover Image',
    lyricsFile: 'Lyrics File (LRC)',
    explicit: 'Explicit',
    publishImmediately: 'Publish immediately',
    uploadTrackButton: 'Upload Track',
    cancelEditing: 'Cancel Editing',
    uploadedTracks: 'Uploaded Tracks',
    searchByNameOrArtist: 'Search by name or artist',
    tracksNotFound: 'No tracks found',
    published: 'Published',
    draft: 'Draft',
    creatingArtist: 'Creating Artist',
    editingArtist: 'Editing Artist',
    artistName: 'Artist Name',
    enterArtistName: 'Enter artist name',
    artistImage: 'Artist Image',
    artistBio: 'Brief artist biography',
    exampleMonthlyListeners: 'For example, 250000',
    creating: 'Creating...',
    createArtist: 'Create Artist',
    existingArtists: 'Existing Artists',
    artistsNotFound: 'No artists found',
    deleteArtistConfirm: 'Delete this artist?',
    artistDeleted: 'Artist deleted',
    failedToDeleteArtist: 'Failed to delete artist',
    editingAlbum: 'Editing Album',
    manageAlbums: 'Manage Albums',
    albumTitle: 'Album Title',
    enterAlbumTitle: 'Enter album title',
    albumType: 'Album',
    singleType: 'Single',
    year: 'Year',
    type: 'Type',
    allAlbums: 'All Albums',
    searchAlbums: 'Search albums',
    albumsNotFound: 'No albums found',
    playlistTitle: 'Playlist Title',
    saving: 'Saving...',
    selectAlbumToEdit: 'Select an album from the list below to edit',
    editButton: 'Edit',
    editingPlaylist: 'Editing Playlist',
    enterPlaylistTitle: 'Enter playlist title',
    supportedFormats: 'Supported formats: JPG, PNG, WEBP up to 5 MB',
    enterPlaylistDescription: 'Enter playlist description',
    noTracksSelected: 'No tracks selected',
    searchTracksByNameOrArtist: 'Search tracks by name or artist',
    tracksNotFoundInSearch: 'No tracks found',
    savingPlaylist: 'Saving...',
    creatingPlaylistProgress: 'Creating...',
    savePlaylist: 'Save Playlist',
    createPlaylistButton: 'Create Playlist',
    reset: 'Reset',
    myPlaylists: 'My Playlists',
    loadingPlaylists: 'Loading playlists...',
    noPlaylistsCreated: 'You haven\'t created any playlists yet',
    tracksCount: 'track(s)',
    public: 'Public',
    private: 'Private',
    totalPlays: 'Total Plays',
    refreshStats: 'Refresh Statistics',
    failedToLoadArtists: 'Failed to load artists list',
    failedToLoadAlbums: 'Failed to load albums list',
    failedToLoadTracks: 'Failed to load tracks',
    playsUpdated: 'Plays updated',
    failedToUpdatePlays: 'Failed to update plays',
    failedToLoadPlaylists: 'Failed to load playlists',
    failedToLoadPlaylist: 'Failed to load playlist',
    deletePlaylistConfirm: 'Delete this playlist?',
    playlistDeleted: 'Playlist deleted',
    failedToDeletePlaylist: 'Failed to delete playlist',
    selectArtistFromList: 'Select an artist from the list',
    enterDurationInSeconds: 'Enter track duration in seconds',
    addAudioFile: 'Add audio file',
    trackUpdated: 'Track updated',
    trackUploaded: 'Track uploaded successfully!',
    failedToSaveTrack: 'Failed to save track',
    playlistUpdated: 'Playlist updated',
    playlistCreated: 'Playlist created successfully!',
    failedToCreatePlaylist: 'Failed to create playlist',
    artistNameRequired: 'Artist name is required',
    artistUpdated: 'Artist updated',
    artistCreated: 'Artist created successfully!',
    failedToSaveArtist: 'Failed to save artist',
    albumUpdated: 'Album updated',
    failedToUpdateAlbum: 'Failed to update album',
    trackHasNoArtist: 'Track has no associated artist',
    deleteTrackConfirm: 'Delete this track?',
    trackDeleted: 'Track deleted',
    failedToDeleteTrack: 'Failed to delete track',
    enabled: 'enabled',
    disabled: 'disabled',
    changeImage: 'Change Image',
    removeImage: 'Remove Image',
    noPlaylists: 'No playlists',
  },
  
  Русский: {
    // Navigation
    home: 'Главная',
    library: 'Библиотека',
    settings: 'Настройки',
    admin: 'Админ',
    
    // Auth
    login: 'Войти',
    logout: 'Выйти',
    signUp: 'Зарегистрироваться',
    username: 'Имя пользователя',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    enterUsername: 'Введите имя пользователя',
    enterPassword: 'Введите пароль',
    loginSubtitle: 'Введите ваши данные для входа',
    registerSubtitle: 'Создайте свой аккаунт',
    invalidCredentials: 'Неверное имя пользователя или пароль',
    rememberMe: 'Запомнить меня',
    dontHaveAccount: 'Нет аккаунта?',
    alreadyHaveAccount: 'Уже есть аккаунт?',
    profile: 'Профиль',
    // Register errors
    usernameTooShort: 'Имя пользователя должно содержать минимум 2 символа',
    passwordTooShort: 'Пароль должен содержать минимум 3 символа',
    passwordsDontMatch: 'Пароли не совпадают',
    usernameExists: 'Имя пользователя уже занято',
    registrationSuccess: 'Регистрация успешна! Перенаправление на вход...',
    
    // Library sections
    playlists: 'Плейлисты',
    artists: 'Исполнители',
    albums: 'Альбомы',
    recentlyPlayed: 'Недавно прослушанные',
    
    // Playlist/Track actions
    play: 'Воспроизвести',
    pause: 'Пауза',
    next: 'Следующий',
    previous: 'Предыдущий',
    shuffle: 'Перемешать',
    repeat: 'Повтор',
    like: 'Нравится',
    unlike: 'Убрать',
    addToQueue: 'Добавить в очередь',
    addToLiked: 'Добавить в любимые',
    removeFromLiked: 'Удалить из любимых',
    goToArtist: 'Перейти к исполнителю',
    goToAlbum: 'Перейти к альбому',
    
    // Player
    nowPlaying: 'Сейчас играет',
    queue: 'Очередь',
    lyrics: 'Текст песни',
    noLyrics: 'Текст песни недоступен',
    nextUp: 'Далее',
    playingFrom: 'Воспроизведение из',
    
    // Search
    searchPlaceholder: 'Что хотите послушать?',
    searchForMusic: 'Найдите музыку',
    noResults: 'Ничего не найдено',
    tryDifferentSearch: 'Попробуйте поискать что-то другое',
    all: 'Все',
    tracks: 'Треки',
    track: 'трек',
    
    // Time
    min: 'мин',
    sec: 'сек',
    
    // Greetings
    goodMorning: 'Доброе утро',
    goodAfternoon: 'Добрый день',
    goodEvening: 'Добрый вечер',
    
    // Sections
    madeForYou: 'Создано для вас',
    recommendedPlaylists: 'Рекомендуемые плейлисты',
    showAll: 'Показать все',
    
    // Settings
    settingsTitle: 'Настройки',
    settingsSubtitle: 'Настройте свой опыт в Sip&Sound',
    
    // Settings sections
    playback: 'Воспроизведение',
    display: 'Отображение',
    languageAndRegion: 'Язык и регион',
    
    // Playback settings
    crossfadeSongs: 'Плавный переход между треками',
    crossfadeDuration: 'Длительность перехода',
    gaplessPlayback: 'Воспроизведение без пауз',
    normalizeVolume: 'Нормализация громкости',
    
    // Display settings
    enableAnimations: 'Анимации интерфейса',
    highContrastMode: 'Режим высокой контрастности',
    compactView: 'Компактный вид',
    
    // Language settings
    language: 'Язык',
    region: 'Регион',
    
    // About
    version: 'Версия',
    madeWith: 'Создано с',
    allRightsReserved: 'Все права защищены',
    
    // Quick access
    likedSongs: 'Любимые треки',
    yourPlaylist: 'Ваш плейлист',
    
    // Artist view
    popularTracks: 'Популярные треки',
    about: 'О исполнителе',
    followers: 'подписчиков',
    monthlyListeners: 'слушателей в месяц',
    
    // Keyboard shortcuts
    keyboardShortcuts: 'Горячие клавиши',
    playbackControl: 'Управление воспроизведением',
    spaceToPlayPause: 'Воспроизведение/Пауза',
    nextTrack: 'Следующий трек',
    previousTrack: 'Предыдущий трек',
    volumeUp: 'Увеличить громкость',
    volumeDown: 'Уменьшить громкость',
    toggleMute: 'Вкл/Выкл звук',
    navigation: 'Навигация',
    toggleQueue: 'Показать/скрыть очередь',
    toggleFullscreen: 'Полноэкранный плеер',
    goHome: 'Перейти на главную',
    goToLibrary: 'Перейти в библиотеку',
    goToSettings: 'Перейти в настройки',
    general: 'Общие',
    toggleShuffle: 'Вкл/Выкл перемешивание',
    toggleRepeat: 'Вкл/Выкл повтор',
    toggleLike: 'Добавить/убрать из любимых',
    
    // Toast messages
    crossfadeEnabled: 'Плавный переход включен',
    crossfadeDisabled: 'Плавный переход выключен',
    gaplessEnabled: 'Воспроизведение без пауз включено',
    gaplessDisabled: 'Воспроизведение без пауз выключено',
    normalizeEnabled: 'Нормализация громкости включена',
    normalizeDisabled: 'Нормализация громкости выключена',
    animationsEnabled: 'Анимации включены',
    animationsDisabled: 'Анимации выключены',
    highContrastEnabled: 'Режим высокой контрастности включен',
    highContrastDisabled: 'Режим высокой контрастности выключен',
    compactViewEnabled: 'Компактный вид включен',
    compactViewDisabled: 'Компактный вид выключен',
    languageChanged: 'Язык изменен на',
    
    // Track added messages
    trackAdded: 'Добавлено в любимые треки',
    trackRemoved: 'Удалено из любимых треков',
    
    // Shuffle and repeat messages
    shuffleOn: 'Перемешивание включено',
    shuffleOff: 'Перемешивание выключено',
    repeatOn: 'Повтор включен',
    repeatOff: 'Повтор выключен',
    
    // Common words
    back: 'Назад',
    songs: 'Треки',
    song: 'трек',
    playlist: 'Плейлист',
    album: 'Альбом',
    duration: 'Длительность',
    title: 'Название',
    artist: 'Исполнитель',
    and: 'и',
    more: 'ещё',
    
    // Empty states
    emptyQueue: 'Очередь пуста',
    emptyQueueDescription: 'Добавьте треки в очередь, чтобы увидеть их здесь',
    noTracksYet: 'Пока нет треков',
    noTracksYetDescription: 'Начните слушать музыку, чтобы увидеть недавно прослушанные треки',
    
    // Time references
    hoursAgo: 'часов назад',
    yesterday: 'Вчера',
    daysAgo: 'дней назад',
    
    // Library categories
    items: 'элементов',
    
    // Library view specific
    yourLibrary: 'Ваша библиотека',
    allYourMusicInOnePlace: 'Вся ваша музыка в одном месте',
    browse: 'Обзор',
    likedSongsTitle: 'Любимые треки',
    yourPlaylists: 'Ваши плейлисты',
    yourAlbums: 'Ваши альбомы',
    yourArtists: 'Ваши исполнители',
    recentlyPlayedTitle: 'Недавно прослушанные',
    
    // Artist view specific
    verifiedArtist: 'Подтвержденный артист',
    following: 'Подписка',
    follow: 'Подписаться',
    unfollow: 'Отписаться',
    singlesAndEP: 'Синглы и EP',
    singles: 'Синглы',
    discography: 'Дискография',
    discographyDescription: 'Все альбомы и релизы',
    topTracksDescription: 'Топ треков за последний месяц',
    moreOptions: 'Еще',
    likedTracks: 'Любимые треки',
    youLiked: 'Вам понравилось',
    by: 'От',
    plays: 'Прослушиваний',
    
    // ShowAll view
    playlistsCount: 'плейлистов',
    
    // Artist view actions
    seeMore: 'Показать больше',
    showLess: 'Показать меньше',
    
    // Sidebar actions
    createPlaylist: 'Создать плейлист',
    creatingPlaylist: 'Создание нового плейлиста...',
    
    // Create Playlist View
    createPlaylistDescription: 'Создайте свой плейлист и добавьте любимые песни',
    playlistCover: 'Обложка плейлиста',
    chooseCoverImage: 'Выберите обложку для вашего плейлиста',
    uploadImage: 'Загрузить изображение',
    playlistName: 'Название плейлиста',
    myPlaylist: 'Мой плейлист',
    playlistDescription: 'Описание',
    addDescription: 'Добавьте описание (необязательно)',
    cancel: 'Отмена',
    startAddingSongs: 'Начните добавлять песни в ваш новый плейлист',
    addTracks: 'Добавить треки',
    searchTracks: 'Поиск треков для добавления',
    searchToAddTracks: 'Найдите треки для добавления в плейлист',
    added: 'добавлено',
    
    // Playlist descriptions
    peacefulPianoDesc: 'Расслабьтесь и насладитесь красивыми фортепианными композициями',
    deepFocusDesc: 'Сохраняйте спокойствие и сосредоточенность с эмбиентом и пост-роком',
    jazzVibesDesc: 'Оригинальный плейлист с инструментальными чилл-битами',
    chillHitsDesc: 'Расслабьтесь под лучшие новые и недавние чилл-хиты',
    allOut2010sDesc: 'Самые популярные песни 2010-х',
    natureSoundsDesc: 'Расслабьтесь под успокаивающие звуки природы',
    workoutBeatsDesc: 'Энергичные треки для ваших тренировок',
    partyMixDesc: 'Лучшие хиты для вечеринок, чтобы начать празднование',
    
    // Profile View
    manageYourProfile: 'Управление настройками профиля',
    clickCameraToUpload: 'Нажмите на иконку камеры, чтобы загрузить новое фото',
    avatarUrlOptional: 'URL аватара (необязательно)',
    saveChanges: 'Сохранить изменения',
    profileUpdatedSuccess: 'Профиль успешно обновлен',
    profileUpdatedError: 'Не удалось обновить профиль',
    usernameCannotBeEmpty: 'Имя пользователя не может быть пустым',
    accountActions: 'Действия с аккаунтом',
    signOutOfYourAccount: 'Выйти из вашего аккаунта',
    
    // Admin Panel
    adminPanel: 'Админ-панель',
    manageTracksPlaylistsStats: 'Управление треками, плейлистами и статистикой',
    stats: 'Статистика',
    uploadTrack: 'Загрузка трека',
    trackTitle: 'Название трека',
    enterTrackTitle: 'Введите название трека',
    selectArtist: 'Выберите артиста из списка',
    artistNotSelected: 'Артист не выбран',
    update: 'Обновить',
    startTypingArtistName: 'Начните вводить имя артиста',
    loadingArtists: 'Загрузка артистов...',
    nothingFound: 'Ничего не найдено',
    searchAlbumOrNewName: 'Поиск альбома или название нового',
    albumNotSelected: 'Альбом не выбран (будет создан сингл с названием трека)',
    selectArtistFirst: 'Сначала выберите артиста',
    genre: 'Жанр',
    musicGenre: 'Жанр музыки',
    durationSeconds: 'Длительность (секунды)',
    audioFile: 'Аудио файл',
    leaveEmptyToUseExisting: 'Оставьте пустым, чтобы использовать существующий файл',
    coverImage: 'Обложка',
    lyricsFile: 'Текст песни (LRC)',
    explicit: 'Ненормативная лексика',
    publishImmediately: 'Публиковать сразу',
    uploadTrackButton: 'Загрузить трек',
    cancelEditing: 'Отменить редактирование',
    uploadedTracks: 'Загруженные треки',
    searchByNameOrArtist: 'Поиск по названию или артисту',
    tracksNotFound: 'Треки не найдены',
    published: 'Публ.',
    draft: 'Черновик',
    creatingArtist: 'Создание артиста',
    editingArtist: 'Редактирование артиста',
    artistName: 'Имя артиста',
    enterArtistName: 'Введите имя артиста',
    artistImage: 'Изображение артиста',
    artistBio: 'Краткая биография артиста',
    exampleMonthlyListeners: 'Например, 250000',
    creating: 'Создание...',
    createArtist: 'Создать артиста',
    existingArtists: 'Существующие артисты',
    artistsNotFound: 'Артисты не найдены',
    deleteArtistConfirm: 'Удалить этого артиста?',
    artistDeleted: 'Артист удалён',
    failedToDeleteArtist: 'Не удалось удалить артиста',
    editingAlbum: 'Редактирование альбома',
    manageAlbums: 'Управление альбомами',
    albumTitle: 'Название альбома',
    enterAlbumTitle: 'Название альбома',
    albumType: 'Альбом',
    singleType: 'Сингл',
    year: 'Год',
    type: 'Тип',
    allAlbums: 'Все альбомы',
    searchAlbums: 'Поиск альбомов',
    albumsNotFound: 'Альбомы не найдены',
    playlistTitle: 'Название плейлиста',
    saving: 'Сохранение...',
    selectAlbumToEdit: 'Выберите альбом из списка ниже для редактирования',
    editButton: 'Редактировать',
    editingPlaylist: 'Редактирование плейлиста',
    enterPlaylistTitle: 'Название плейлиста',
    supportedFormats: 'Поддерживаются форматы JPG, PNG, WEBP до 5 МБ',
    enterPlaylistDescription: 'Описание плейлиста',
    noTracksSelected: 'Треки не выбраны',
    searchTracksByNameOrArtist: 'Поиск треков по названию или артисту',
    tracksNotFoundInSearch: 'Треки не найдены',
    savingPlaylist: 'Сохранение...',
    creatingPlaylistProgress: 'Создание...',
    savePlaylist: 'Сохранить плейлист',
    createPlaylistButton: 'Создать плейлист',
    reset: 'Сбросить',
    myPlaylists: 'Мои плейлисты',
    loadingPlaylists: 'Загрузка плейлистов...',
    noPlaylistsCreated: 'Вы ещё не создали плейлистов',
    tracksCount: 'трек(ов)',
    public: 'Публичный',
    private: 'Приватный',
    totalPlays: 'Всего прослушиваний',
    refreshStats: 'Обновить статистику',
    failedToLoadArtists: 'Не удалось загрузить список артистов',
    failedToLoadAlbums: 'Не удалось загрузить список альбомов',
    failedToLoadTracks: 'Не удалось загрузить треки',
    playsUpdated: 'Прослушивания обновлены',
    failedToUpdatePlays: 'Не удалось обновить прослушивания',
    failedToLoadPlaylists: 'Не удалось загрузить плейлисты',
    failedToLoadPlaylist: 'Не удалось загрузить плейлист',
    deletePlaylistConfirm: 'Удалить этот плейлист?',
    playlistDeleted: 'Плейлист удалён',
    failedToDeletePlaylist: 'Не удалось удалить плейлист',
    selectArtistFromList: 'Выберите артиста из списка',
    enterDurationInSeconds: 'Укажите длительность трека в секундах',
    addAudioFile: 'Добавьте аудиофайл',
    trackUpdated: 'Трек обновлён',
    trackUploaded: 'Трек успешно загружен!',
    failedToSaveTrack: 'Ошибка сохранения трека',
    playlistUpdated: 'Плейлист обновлён',
    playlistCreated: 'Плейлист успешно создан!',
    failedToCreatePlaylist: 'Ошибка создания плейлиста',
    artistNameRequired: 'Имя артиста обязательно',
    artistUpdated: 'Артист обновлён',
    artistCreated: 'Артист успешно создан!',
    failedToSaveArtist: 'Ошибка сохранения артиста',
    albumUpdated: 'Альбом обновлён',
    failedToUpdateAlbum: 'Ошибка обновления альбома',
    trackHasNoArtist: 'У трека нет связанного артиста',
    deleteTrackConfirm: 'Удалить этот трек?',
    trackDeleted: 'Трек удалён',
    failedToDeleteTrack: 'Не удалось удалить трек',
    enabled: 'включено',
    disabled: 'выключено',
    changeImage: 'Изменить изображение',
    removeImage: 'Удалить изображение',
    noPlaylists: 'Нет плейлистов',
  },
};

export type TranslationKey = keyof typeof translations.English;

export function getTranslation(language: Language, key: TranslationKey): string {
  return translations[language][key] || translations.English[key];
}

// Функция для склонения русских слов
export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod100 >= 11 && mod100 <= 19) {
    return many;
  }
  
  if (mod10 === 1) {
    return one;
  }
  
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  
  return many;
}

// Функция для множественного числа в английском
export function pluralizeEn(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}
