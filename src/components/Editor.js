import React, { useState, useRef, useEffect } from 'react';
import useDragAndDrop from '../hooks/useDragAndDrop';

const initialBlocks = [
  { id: '1', type: 'text', content: 'This is a text block.' },
  { id: '2', type: 'heading', content: 'This is a heading block.' },
  { id: '3', type: 'todo', content: 'This is a to-do block.', completed: false },
];

const Editor = () => {
  const { blocks, handleDragStart, handleDragOver, handleDrop, setBlocks } =
    useDragAndDrop(initialBlocks);

  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [toolbarStates, setToolbarStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    code: false,
    link: false,
  });
  const [activeBlockId, setActiveBlockId] = useState(null); // Track the block for which the dropdown is active
  const [activeBlockMenuId, setActiveBlockMenuId] = useState(null); // For the "+" dropdown
  const [activeThreeDotMenuId, setActiveThreeDotMenuId] = useState(null); // For the "three dots" dropdown
  const blockRefs = useRef({}); // Store references to each block
  const editorRef = useRef(null); // Reference to the editor container

  useEffect(() => {
    const handleClickOutside = (event) => {
      const selection = window.getSelection();
      const isTextSelected = selection && !selection.isCollapsed;

      if (
        editorRef.current &&
        !editorRef.current.contains(event.target) &&
        !isTextSelected
      ) {
        setToolbarVisible(false); // Hide the toolbar
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const changeBlockType = (blockId, newType) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              type: typeof newType === 'object' ? newType.type : newType,
              headingLevel: typeof newType === 'object' ? newType.level : undefined,
              content: typeof newType === 'object' && newType.type === 'heading' 
                ? block.content 
                : newType === 'todo' 
                  ? 'New to-do item' 
                  : block.content,
              completed: newType === 'todo' ? false : undefined,
            }
          : block
      )
    );
  };

  const deleteBlock = (blockId) => {
    setBlocks(blocks.filter((block) => block.id !== blockId));
  };

  const updateBlockContent = (blockId, newContent) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, content: newContent } : block
      )
    );
  };

  const toggleTodoCompletion = (blockId) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, completed: !block.completed } : block
      )
    );
  };

  const handleKeyDown = (e, blockId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentBlock = blocks.find((block) => block.id === blockId);
      const blockContent = blockRefs.current[blockId]?.textContent || '';

      if (currentBlock.type === 'todo' && blockContent.trim() === '') {
        e.preventDefault();
        
        // If has indentation, reduce it first
        if (currentBlock.indentation > 0) {
          setBlocks(blocks.map(block => 
            block.id === blockId 
              ? { ...block, indentation: block.indentation - 1 }
              : block
          ));
        } 
        // If at root level (no indentation), convert to text block
        else {
          setBlocks(blocks.map(block =>
            block.id === blockId
              ? { ...block, type: 'text', content: '' }
              : block
          ));
        }
      } else {
        addBlockBelow(blockId);
      }
    } else if (e.key === 'Backspace') {
      const currentBlock = blocks.find((block) => block.id === blockId);
      // Get the actual content from the DOM element
      const blockContent = blockRefs.current[blockId]?.textContent || '';
      
      if (blockContent.trim() === '') {
        e.preventDefault();
        const index = blocks.findIndex((block) => block.id === blockId);

        if (index > 0) {
          const previousBlock = blocks[index - 1];
          deleteBlock(blockId);
          
          // Focus the previous block on the next tick
          setTimeout(() => {
            const prevBlockEl = blockRefs.current[previousBlock.id];
            if (prevBlockEl) {
              prevBlockEl.focus();
              // Place cursor at the end of the previous block
              const range = document.createRange();
              const selection = window.getSelection();
              range.selectNodeContents(prevBlockEl);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }, 0);
        }
      }
    } else if (e.key === 'Tab') {
      const currentBlock = blocks.find((block) => block.id === blockId);
      if (currentBlock.type === 'todo') {
        e.preventDefault(); // Prevent default tab behavior
        addIndentation(blockId); // Add indentation to the current block
      }
    } else if (e.key === ' ') {
      const currentBlock = blocks.find((block) => block.id === blockId);
      const blockContent = blockRefs.current[blockId]?.textContent || '';
      
      // Handle Markdown shortcuts
      switch (blockContent.trim()) {
        case '#':
          e.preventDefault();
          changeBlockType(blockId, 'heading');
          blockRefs.current[blockId].textContent = '';
          return;
        
        case '-':
          e.preventDefault();
          changeBlockType(blockId, 'text');
          blockRefs.current[blockId].textContent = '•';
          return;
        
        case '[]':
          e.preventDefault();
          changeBlockType(blockId, 'todo');
          blockRefs.current[blockId].textContent = '';
          return;

        case '##':
          e.preventDefault();
          setBlocks(blocks.map(block =>
            block.id === blockId ? {
              ...block,
              type: 'heading',
              headingLevel: 2,
              content: ''
            } : block
          ));
          return;

        case '###':
          e.preventDefault();
          setBlocks(blocks.map(block =>
            block.id === blockId ? {
              ...block,
              type: 'heading',
              headingLevel: 3,
              content: ''
            } : block
          ));
          return;
      }
    }
  };

  const addIndentation = (blockId) => {
    const currentBlockIndex = blocks.findIndex(block => block.id === blockId);
    const currentBlock = blocks[currentBlockIndex];
    const previousBlock = currentBlockIndex > 0 ? blocks[currentBlockIndex - 1] : null;

    setBlocks(
      blocks.map((block) => {
        if (block.id === blockId) {
          const currentIndentation = block.indentation || 0;
          let maxAllowedIndentation = 0;

          // If there's a previous block and it's a todo
          if (previousBlock && previousBlock.type === 'todo') {
            // Allow indenting one level more than the previous block
            maxAllowedIndentation = (previousBlock.indentation || 0) + 1;
          }

          // Only indent if we haven't reached the maximum allowed indentation
          if (currentIndentation < maxAllowedIndentation) {
            return {
              ...block,
              indentation: currentIndentation + 1,
            };
          }
        }
        return block;
      })
    );
  };

  const addBlockBelow = (blockId) => {
    const currentBlock = blocks.find((block) => block.id === blockId);
    const newBlock = {
      id: Date.now().toString(),
      type: currentBlock.type === 'todo' ? 'todo' : 'text',
      content: '',
      ...(currentBlock.type === 'todo' && { 
        completed: false,
        // Inherit the same indentation level as the current block
        indentation: currentBlock.indentation || 0
      }),
    };

    const index = blocks.findIndex((block) => block.id === blockId);
    const updatedBlocks = [
      ...blocks.slice(0, index + 1),
      newBlock,
      ...blocks.slice(index + 1),
    ];
    setBlocks(updatedBlocks);

    setTimeout(() => focusBlock(newBlock.id), 0);
  };

  const focusBlock = (blockId) => {
    const blockElement = blockRefs.current[blockId];
    if (blockElement) {
      blockElement.focus();

      // Move the caret to the end of the content
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(blockElement);
      range.collapse(false); // Collapse the range to the end
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const getParentOfSelectedText = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let parentNode = range.commonAncestorContainer;
      
      // If the parentNode is a text node, get its parent element
      if (parentNode.nodeType === Node.TEXT_NODE) {
        parentNode = parentNode.parentNode;
      }
      
      // Check if the text is within a link
      const linkParent = parentNode.closest('a');
      if (linkParent) {
        return linkParent;
      }
      
      return parentNode;
    }
    return null;
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const parent = getParentOfSelectedText();

      if (!selection.isCollapsed) {
        // Show the toolbar near the selected text
        setToolbarPosition({ top: rect.top - 40, left: rect.left });
        setToolbarVisible(true);

        // Update the toolbar button states based on the current formatting
        setToolbarStates({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          code: parent && parent.tagName === 'CODE', // Custom handling for code
        });
      } else {
        // Hide the toolbar if no text is selected
        setToolbarVisible(false);
      }
    } else {
      // Hide the toolbar if no selection exists
      setToolbarVisible(false);
    }
  };

  const applyFormatting = (command, value = null) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (command === 'code') {
      // Custom toggle for <code> formatting
      const parentNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;

      if (parentNode.tagName === 'CODE') {
      // If already wrapped in <code>, unwrap it while preserving child formatting
      const fragment = document.createDocumentFragment();
      while (parentNode.firstChild) {
        fragment.appendChild(parentNode.firstChild); // Move child nodes to the fragment
      }
      parentNode.replaceWith(fragment); // Replace <code> with its children
      } else {
      // Wrap the selected text in a <code> tag
      const selectedText = range.toString();
      if (selectedText) {
        const codeElement = document.createElement('code');
        codeElement.textContent = selectedText;
        range.deleteContents();
        range.insertNode(codeElement);
      }
      }
    } else {
      // Handle formatting when the parent is <code>
      const parentNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;

      if (parentNode.tagName === 'CODE') {
      // Wrap <code> along with the selected text in the new formatting
      const wrapper = document.createElement(command === 'bold' ? 'b' :
                          command === 'italic' ? 'i' :
                          command === 'underline' ? 'u' :
                          command === 'strikeThrough' ? 's' : 'span');
      wrapper.appendChild(parentNode.cloneNode(true)); // Clone the <code> element
      parentNode.replaceWith(wrapper); // Replace <code> with the new wrapper
      } else {
        // Use execCommand for standard formatting (bold, italic, etc.)
        document.execCommand(command, false, value);
      }
    }

    // Update the toolbar states after applying formatting
    const parent = getParentOfSelectedText();
    setToolbarStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      code: parent && parent.tagName === 'CODE',
    });
  };

  const addLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const url = prompt('Enter the URL:', 'https://');
    if (url) {
      const range = selection.getRangeAt(0);
      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
      
      // If the selected text is within a code block, handle specially
      const parentNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;
      
      if (parentNode.tagName === 'CODE') {
        const codeContent = parentNode.textContent;
        linkElement.appendChild(document.createElement('code'));
        linkElement.querySelector('code').textContent = selection.toString();
        range.deleteContents();
        range.insertNode(linkElement);
      } else {
        linkElement.textContent = selection.toString();
        range.deleteContents();
        range.insertNode(linkElement);
      }
      
      // Update toolbar states
      setToolbarStates(prev => ({
        ...prev,
        link: true
      }));
    }
  };

  const handleLinkClick = (e) => {
    if (e.target.tagName === 'A') {
      // Prevent default to avoid contentEditable behavior
      e.preventDefault();
      
      // Single click opens the link
      if (e.detail === 1) {
        window.open(e.target.href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleLinkDoubleClick = (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const currentUrl = e.target.href;
      const newUrl = prompt('Update link URL:', currentUrl);
      
      if (newUrl && newUrl !== currentUrl) {
        e.target.href = newUrl;
      }
    }
  };

  const toggleBlockTypeMenu = (blockId) => {
    setActiveBlockMenuId((prev) => (prev === blockId ? null : blockId)); // Toggle "+" dropdown
    setActiveThreeDotMenuId(null); // Close "three dots" dropdown
  };

  const toggleThreeDotMenu = (blockId) => {
    setActiveThreeDotMenuId((prev) => (prev === blockId ? null : blockId)); // Toggle "three dots" dropdown
    setActiveBlockMenuId(null); // Close "+" dropdown
  };

  const handleBlockTypeChange = (blockId, newType) => {
    changeBlockType(blockId, newType);
    setActiveBlockMenuId(null); // Close the dropdown after selection
  };

  return (
    <div
      ref={editorRef} // Attach the ref to the editor container
      className="editor"
      onMouseUp={handleTextSelection}
      onKeyUp={handleTextSelection} // Update toolbar on keyboard selection changes
    >
      {blocks.map((block) => (
        <div
          key={block.id}
          draggable
          onDragStart={() => handleDragStart(block.id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(block.id)}
          className="block"
          onMouseLeave={() => {
            setActiveBlockMenuId(null);
            setActiveThreeDotMenuId(null);
          }} // Collapse both dropdowns on mouse leave
          onClick={(e) => focusBlock(e, block.id)} // Handle block click
        >
          <div className="block-controls">
            {/* Six-dot button for dropdown */}
            <button
              className="six-dot-btn"
              onClick={() => toggleThreeDotMenu(block.id)}
            >
              <i className="fas fa-grip-vertical"></i> {/* Six dots icon */}
            </button>
            {activeThreeDotMenuId === block.id && (
              <div className="block-menu">
                <button onClick={() => deleteBlock(block.id)}>
                  <i className="fas fa-trash-alt"></i> Delete Block
                </button>
              </div>
            )}
            {/* "+" button for dropdown */}
            <button
              className="add-block-btn"
              onClick={() => toggleBlockTypeMenu(block.id)}
            >
              <i className="fas fa-plus"></i> {/* Plus icon */}
            </button>
            {activeBlockMenuId === block.id && (
              <div className="block-menu">
                <button onClick={() => handleBlockTypeChange(block.id, 'text')}>
                  <i className="fas fa-t"></i> Text
                </button>
                <button onClick={() => handleBlockTypeChange(block.id, { type: 'heading', level: 1 })}>
                  <i className="fas fa-heading"></i> Heading 1
                </button>
                <button onClick={() => handleBlockTypeChange(block.id, { type: 'heading', level: 2 })}>
                  <i className="fas fa-heading"></i> Heading 2
                </button>
                <button onClick={() => handleBlockTypeChange(block.id, { type: 'heading', level: 3 })}>
                  <i className="fas fa-heading"></i> Heading 3
                </button>
                <button onClick={() => handleBlockTypeChange(block.id, 'todo')}>
                  <i className="fas fa-check-square"></i> To-Do
                </button>
              </div>
            )}
          </div>
          {/* Render block content */}
          {block.type === 'heading' && (
            <div
              ref={(el) => (blockRefs.current[block.id] = el)}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onBlur={(e) => updateBlockContent(block.id, e.target.innerText)}
              className={`heading-${block.headingLevel || 1}`}
            >
              {block.content}
            </div>
          )}
          {block.type === 'text' && (
            <p
              ref={(el) => (blockRefs.current[block.id] = el)}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => handleKeyDown(e, block.id)}
              onBlur={(e) => updateBlockContent(block.id, e.target.innerText)}
              onClick={handleLinkClick}
              onDoubleClick={handleLinkDoubleClick}
              style={{ width: '100%' }}
            >
              {block.content}
            </p>
          )}
          {block.type === 'todo' && (
            <div
              className="todo-block"
              data-indentation={block.indentation || 0}
              style={{
                '--indentation-level': block.indentation || 0,
              }}
            >
              <input
                type="checkbox"
                checked={block.completed}
                onChange={() => toggleTodoCompletion(block.id)}
              />
              <span
                ref={(el) => (blockRefs.current[block.id] = el)}
                contentEditable
                suppressContentEditableWarning
                onKeyDown={(e) => handleKeyDown(e, block.id)}
                onBlur={(e) => updateBlockContent(block.id, e.target.innerText)}
                style={{
                  textDecoration: block.completed ? 'line-through' : 'none',
                  width: '100%',
                }}
              >
                {block.content}
              </span>
            </div>
          )}
        </div>
      ))}
      {/* Text Formatting Toolbar */}
      {toolbarVisible && (
        <div
          className="text-toolbar"
          style={{
            position: 'absolute',
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '5px',
            display: 'flex',
            gap: '5px',
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => applyFormatting('bold')}
            style={{ fontWeight: 'bold' }}
            className={toolbarStates.bold ? 'active' : ''}
          >
            B
          </button>
          <button
            onClick={() => applyFormatting('italic')}
            style={{ fontStyle: 'italic' }}
            className={toolbarStates.italic ? 'active' : ''}
          >
            I
          </button>
          <button
            onClick={() => applyFormatting('underline')}
            style={{ textDecoration: 'underline' }}
            className={toolbarStates.underline ? 'active' : ''}
          >
            U
          </button>
          <button
            onClick={() => applyFormatting('strikeThrough')}
            style={{ textDecoration: 'line-through' }}
            className={toolbarStates.strikeThrough ? 'active' : ''}
          >
            S
          </button>
          <button
            onClick={() => applyFormatting('code')}
            style={{ fontFamily: 'monospace' }}
            className={toolbarStates.code ? 'active' : ''}
          >
            &lt;/&gt;
          </button>
          <button
            onClick={addLink}
            className={toolbarStates.link ? 'active' : ''}
            title="Add Link"
          >
            <i className="fas fa-link"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default Editor;