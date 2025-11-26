
import Tiptap from '../components/Tiptap.jsx';
import React, { useState, useCallback, useEffect } from 'react';
import '/src/index.css';

const NotesPage = () => {
    const [filePath, setFilePath] = useState(null);
    const [content, setContent] = useState(null);
    const [isSaved, setIsSaved] = useState(true);
    const [noteFiles, setNoteFiles] = useState([]);

    const loadNoteFiles = async () => {
        const files = await window.api.getNoteFiles();
        setNoteFiles(files);
    };

    useEffect(() => {
        loadNoteFiles();
    }, []);

    const handleOpenFile = async (fileName) => {
        // The main process will construct the full path
        const result = await window.api.readNoteFile(fileName);
        if (result) {
            setFilePath(result.filePath);
            try {
                // We save notes as JSON, so we try to parse it.
                const parsedContent = JSON.parse(result.content);
                setContent(parsedContent);
            } catch (error) {
                // If it's not JSON we treat it as plain text.
                console.warn("File content is not valid JSON. Treating as plain text.", error);
                setContent({
                    type: 'doc',
                    content: [{
                        type: 'paragraph',
                        ...(result.content && { content: [{ type: 'text', text: result.content }] }),
                    }],
                });
            }
            setIsSaved(true);
        }
    };

    useEffect(() => {
        // Don't save if there's no file path or if content is null (initial state).
        if (!filePath || content === null) {
            return;
        }

        const handler = setTimeout(() => {
            const contentString = JSON.stringify(content, null, 2);
            window.api.saveFile(filePath, contentString);
            loadNoteFiles(); // Refresh file list after saving
            setIsSaved(true);
        }, 400); // Wait x after the user stops typing to save.

        // This cleanup functio runs before the next effect or on unmount.
        // It clears the timeout, preventing the save if the content changes again quickly.
        return () => clearTimeout(handler);
    }, [content, filePath]);


    const handleContentUpdate = useCallback((newContent) => {
        // This function now only updates the local state.
        // The useEffect hook will handle the saving
        setIsSaved(false);
        setContent(newContent);
    }, []);    

    const handleNewNote = async () => {
        const title = "Untitled Note";
        if (title) { // Keep this check in case a cancelable modal is added later
            const result = await window.api.createNote(title);
            if (result.success) {
                await loadNoteFiles(); // Refresh the file list
                handleOpenFile(result.fileName); // Open the new note
            } else {
                alert(`Error creating note: ${result.error}`);
            }
        }
    };

        


    return (
        <div className="notes-layout">
            <aside className="notes-sidebar">
            <div className="sidebar-header">
                <h2>Notes</h2>
                <div className="sidebar-actions">
                    <button onClick={handleNewNote} title="New Note">+</button>
                    <button onClick={() => window.api.openNotesFolder()} title="Open Notes Folder">📂</button>
                </div>
            </div>
                <div className="note-files-list">
                    {noteFiles.map((file) => (
                        <div key={file} className="note-file-item" onClick={() => handleOpenFile(file)}>
                            {file}
                        </div>
                    ))}
                </div>
                <div className="file-status-panel">
                    {filePath && (
                    <div className="file-info">
                        <strong>Editing:</strong>
                        <p>{filePath}</p>
                        <p className={isSaved ? 'status-saved' : 'status-unsaved'}>
                            {isSaved ? 'Saved' : 'Unsaved'}
                        </p>
                    </div>
                    )}  
                </div>
            </aside>
            <main className="notes-main-content">
                <div className="note-editor-panel">
                    <Tiptap content={content} onUpdate={handleContentUpdate} />
                </div>
            </main>

        </div>
    );
};

export default NotesPage;