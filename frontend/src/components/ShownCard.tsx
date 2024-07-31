import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Collapse,
    IconButton,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { styled, keyframes } from '@mui/material/styles';

// 定义 fadeIn 动画
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

interface CardData {
    cardId: string;
    disabled: boolean;
    repoUrl: string;
    openaiEndpoint: string;
    apiModel: string;
    apiKey: string;
}

interface EditMode {
    cardId: string;
    field: string;
}

interface CardComponentProps {
    card: CardData;
    editMode: EditMode;
    confirmDelete?: string | null;
    showCaption?: boolean;
    handleChange: (cardId: string, field: string, value: string) => void;
    handleSave: (cardId: string) => void;
    handleDoubleClick: (cardId: string, field: string) => void;
    handleDeleteCard: (cardId: string) => void;
    handleToggleCard: (cardId: string) => void;
}

const ExpandMore = styled((props: any) => {
    const { expand, ...other } = props;
    return <IconButton {...other} />;
})(({ theme, expand }: { theme: any; expand: boolean }) => ({
    transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
    marginLeft: 'auto',
    transition: theme.transitions.create('transform', {
        duration: theme.transitions.duration.shortest,
    }),
}));

const obscureApiKey = (apiKey: string): string => {
    if (apiKey.length <= 8) return apiKey;
    const visibleCharacters = 4;
    const obscuredSectionLength = apiKey.length - visibleCharacters * 2;
    const obscuredSection = '*'.repeat(obscuredSectionLength);
    return `${apiKey.substring(0, visibleCharacters)}${obscuredSection}${apiKey.substring(apiKey.length - visibleCharacters)}`;
};

const ShownCard: React.FC<CardComponentProps> = ({
                                                     card,
                                                     editMode,
                                                     handleChange,
                                                     handleSave,
                                                     handleDoubleClick,
                                                     handleDeleteCard,
                                                     handleToggleCard,
                                                     showCaption = false,
                                                     confirmDelete,
                                                 }) => {
    const [expanded, setExpanded] = useState(false);

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    return (
        <Card
            key={card.cardId}
            variant="outlined"
            sx={{
                mb: 2,
                boxShadow: card.disabled ? 1 : 3,
                animation: `${fadeIn} 0.5s ease-in-out`,
                transition: 'box-shadow 0.3s ease-in-out, opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
                opacity: card.disabled ? 0.5 : 1,
                transform: 'translateY(0)',
                '&:hover': {
                    transform: 'scale(1.005)',
                },
            }}
        >
            <CardHeader
                title={
                    <Typography
                        variant="h6"
                        sx={{
                            transition: 'color 0.3s ease-in-out',
                            color: card.disabled ? 'text.disabled' : 'text.primary',
                        }}
                    >
                        {card.repoUrl.replace(/\/$/, '').split('/').slice(-1)}
                    </Typography>
                }
                action={
                    <ExpandMore
                        expand={expanded}
                        onClick={handleExpandClick}
                        aria-expanded={expanded}
                        aria-label="show more"
                    >
                        <ExpandMoreIcon />
                    </ExpandMore>
                }
            />
            <CardContent sx={{ position: 'relative' }}>
                <Box
                    sx={{
                        border: '1px dashed',
                        borderRadius: '5px',
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2,
                        transition: 'border-color 0.3s ease-in-out',
                        '&:hover': {
                            borderColor: 'lightblue',
                        },
                    }}
                >
                    <Typography variant="body1" sx={{ flex: 1 }}>UUID: {card.cardId}</Typography>
                    <CopyToClipboard text={card.cardId}>
                        <Tooltip title="Copy UUID" arrow>
                            <IconButton>
                                <ContentCopyIcon />
                            </IconButton>
                        </Tooltip>
                    </CopyToClipboard>
                </Box>
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Table sx={{ mt: 2 }}>
                        <TableBody>
                            <TableRow>
                                <TableCell><strong>OpenAI Endpoint</strong></TableCell>
                                <TableCell>
                                    {editMode.cardId === card.cardId && editMode.field === 'openaiEndpoint' ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                                                '&:hover': {
                                                    backgroundColor: 'lightblue',
                                                    cursor: 'pointer',
                                                },
                                                transition: 'background-color 0.3s ease-in-out',
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
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                                                '&:hover': {
                                                    backgroundColor: 'lightblue',
                                                    cursor: 'pointer',
                                                },
                                                transition: 'background-color 0.3s ease-in-out',
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
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                                                '&:hover': {
                                                    backgroundColor: 'lightblue',
                                                    cursor: 'pointer',
                                                },
                                                transition: 'background-color 0.3s ease-in-out',
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
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                                                '&:hover': {
                                                    backgroundColor: 'lightblue',
                                                    cursor: 'pointer',
                                                },
                                                transition: 'background-color 0.3s ease-in-out',
                                            }}
                                            onDoubleClick={() => handleDoubleClick(card.cardId, 'repoUrl')}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Collapse>
                <Box
                    sx={{
                        mt: 2,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        '& > *': {
                            transition: 'color 0.3s ease-in-out',
                        },
                    }}
                >
                    <Tooltip title="Delete" arrow>
                        <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeleteCard(card.cardId)}
                            sx={{
                                color: confirmDelete === card.cardId ? 'indianred' : 'grey',
                            }}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Toggle Card" arrow>
                        <Switch
                            checked={!card.disabled}
                            onChange={() => handleToggleCard(card.cardId)}
                            sx={{ mr: 1 }}
                        />
                    </Tooltip>
                    <Tooltip title="Open Repository" arrow>
                        <IconButton
                            edge="start"
                            aria-label="open-repo"
                            onClick={() => window.open(card.repoUrl, '_blank')}
                        >
                            <OpenInNewIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                {showCaption && (
                    <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                        Double click on a tag to edit its properties!
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

export default ShownCard;