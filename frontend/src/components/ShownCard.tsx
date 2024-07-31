import React, {useState} from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Collapse,
    IconButton,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {CopyToClipboard} from 'react-copy-to-clipboard';
import {keyframes} from '@emotion/react';

const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const slideIn = keyframes`
    from {
        transform: translateX(-10px);
    }
    to {
        transform: translateX(0);
    }
`;

const highlightColor = keyframes`
    0% {
        background-color: transparent;
    }
    100% {
        background-color: rgba(0, 0, 0, 0.1);
    }
`;

interface CardComponentProps {
    card: {
        cardId: string;
        disabled: boolean;
        repoUrl: string;
        openaiEndpoint: string;
        apiModel: string;
        apiKey: string;
    };
    editMode: {
        cardId: string;
        field: string;
    };
    confirmDelete?: string | null
    showCaption?: boolean;
    handleChange: (cardId: string, field: string, value: string) => void;
    handleSave: (cardId: string) => void;
    handleDoubleClick: (cardId: string, field: string) => void;
    handleDeleteCard: (cardId: string) => void;
    handleToggleCard: (cardId: string) => void;
}

const obscureApiKey = (apiKey: string): string => {
    if (apiKey.length <= 8) return apiKey;
    const visibleCharacters = 4;
    const obscuredSectionLength = apiKey.length - (visibleCharacters * 2);
    const obscuredSection = '*'.repeat(obscuredSectionLength);
    return `${apiKey.substring(0, visibleCharacters)}${obscuredSection}${apiKey.substring(apiKey.length - visibleCharacters)}`;
};

const ShownCard: React.FC<CardComponentProps> = (
    {
        card,
        editMode,
        handleChange,
        handleSave,
        handleDoubleClick,
        handleDeleteCard,
        handleToggleCard,
        showCaption = false,
        confirmDelete
    }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <Card key={card.cardId} variant="outlined" sx={{
            mb: 2,
            boxShadow: card.disabled ? 1 : 3,
            transition: 'box-shadow 0.3s, opacity 0.3s, transform 0.3s',
            opacity: card.disabled ? 0.5 : 1,
            animation: `${fadeIn} 0.5s`,
            '&:hover': {
                transform: 'scale(1.005)'
            }
        }}>
            <CardContent sx={{position: 'relative'}}>
                <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <Typography variant="h6" sx={{
                        mb: 2,
                        transition: 'color 0.3s',
                        color: card.disabled ? 'text.disabled' : 'text.primary',
                        animation: `${slideIn} 0.5s`
                    }}>
                        {card.repoUrl.replace(/\/$/, '').split('/').slice(-1)}
                    </Typography>
                    <IconButton
                        onClick={() => setExpanded(!expanded)}
                        aria-expanded={expanded}
                        aria-label="show more"
                    >
                        <ExpandMoreIcon sx={{
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.3s',
                        }}/>
                    </IconButton>
                </Box>

                <Box sx={{
                    border: '1px dashed',
                    borderRadius: '5px',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    animation: `${highlightColor} 0.5s`
                }}>
                    <Typography variant="body1" sx={{flex: 1}}>UUID: {card.cardId}</Typography>
                    <CopyToClipboard text={card.cardId}>
                        <IconButton>
                            <ContentCopyIcon/>
                        </IconButton>
                    </CopyToClipboard>
                </Box>

                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Table sx={{animation: `${fadeIn} 0.5s`, mt: 2}}>
                        <TableBody>
                            <TableRow>
                                <TableCell><strong>OpenAI Endpoint</strong></TableCell>
                                <TableCell>
                                    {editMode.cardId === card.cardId && editMode.field === 'openaiEndpoint' ? (
                                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                                            <TextField
                                                fullWidth
                                                value={card.openaiEndpoint}
                                                onChange={(e) => handleChange(card.cardId, 'openaiEndpoint', e.target.value)}
                                            />
                                            <Button onClick={() => handleSave(card.cardId)}>Save</Button>
                                        </Box>
                                    ) : (
                                        <Chip
                                            label={card.openaiEndpoint}
                                            sx={{
                                                transition: 'background-color 0.3s',
                                                animation: `${fadeIn} 0.5s`,
                                                '&:hover': {
                                                    backgroundColor: 'lightblue',
                                                    cursor: 'pointer'
                                                },
                                            }}
                                            onDoubleClick={() => handleDoubleClick(card.cardId, 'openaiEndpoint')}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell><strong>Model</strong></TableCell>
                                <TableCell>
                                    {editMode.cardId === card.cardId && editMode.field === 'apiModel' ? (
                                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                                            <TextField
                                                fullWidth
                                                value={card.apiModel}
                                                onChange={(e) => handleChange(card.cardId, 'apiModel', e.target.value)}
                                            />
                                            <Button onClick={() => handleSave(card.cardId)}>Save</Button>
                                        </Box>
                                    ) : (
                                        <Chip
                                            label={card.apiModel}
                                            sx={{
                                                transition: 'background-color 0.3s',
                                                animation: `${fadeIn} 0.5s`,
                                                '&:hover': {
                                                    backgroundColor: 'lightblue',
                                                    cursor: 'pointer'
                                                }
                                            }}
                                            onDoubleClick={() => handleDoubleClick(card.cardId, 'apiModel')}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell><strong>API Key</strong></TableCell>
                                <TableCell>
                                    {editMode.cardId === card.cardId && editMode.field === 'apiKey' ? (
                                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                                            <TextField
                                                fullWidth
                                                value={card.apiKey}
                                                onChange={(e) => handleChange(card.cardId, 'apiKey', e.target.value)}
                                            />
                                            <Button onClick={() => handleSave(card.cardId)}>Save</Button>
                                        </Box>
                                    ) : (
                                        <Chip
                                            label={obscureApiKey(card.apiKey)}
                                            sx={{
                                                transition: 'background-color 0.3s',
                                                animation: `${fadeIn} 0.5s`,
                                                '&:hover': {
                                                    backgroundColor: 'lightblue',
                                                    cursor: 'pointer'
                                                }
                                            }}
                                            onDoubleClick={() => handleDoubleClick(card.cardId, 'apiKey')}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell><strong>Repository URL</strong></TableCell>
                                <TableCell>
                                    {editMode.cardId === card.cardId && editMode.field === 'repoUrl' ? (
                                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                                            <TextField
                                                fullWidth
                                                value={card.repoUrl}
                                                onChange={(e) => handleChange(card.cardId, 'repoUrl', e.target.value)}
                                            />
                                            <Button onClick={() => handleSave(card.cardId)}>Save</Button>
                                        </Box>
                                    ) : (
                                        <Chip
                                            label={card.repoUrl}
                                            sx={{
                                                transition: 'background-color 0.3s',
                                                animation: `${fadeIn} 0.5s`,
                                                '&:hover': {
                                                    backgroundColor: 'lightblue',
                                                    cursor: 'pointer'
                                                }
                                            }}
                                            onDoubleClick={() => handleDoubleClick(card.cardId, 'repoUrl')}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Collapse>

                <Box sx={{
                    mt: 2,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center'
                }}>
                    <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteCard(card.cardId)}
                        sx={{
                            color: confirmDelete === card.cardId ? 'indianred' : 'grey',
                            transition: 'color 0.3s',
                        }}
                    >
                        <DeleteIcon/>
                    </IconButton>
                    <Switch
                        checked={!card.disabled}
                        onChange={() => handleToggleCard(card.cardId)}
                        sx={{mr: 1}}
                    />
                    <IconButton
                        edge="start"
                        aria-label="open-repo"
                        onClick={() => window.open(card.repoUrl, '_blank')}
                    >
                        <OpenInNewIcon/>
                    </IconButton>
                </Box>

                {showCaption && (
                    <Typography variant="caption" sx={{mt: 1, color: 'text.secondary'}}>
                        Double click on a tag to edit its properties!
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

export default ShownCard;