import React from 'react';
import { View, Text, Pressable, ViewProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface PaginationProps extends ViewProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange, className, ...props }: PaginationProps) {
    const pages = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <View className={`flex-row items-center justify-center gap-2 py-4 ${className || ''}`} {...props}>
            <Pressable
                onPress={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 ${currentPage === 1 ? 'opacity-50' : ''}`}
            >
                <MaterialIcons name="chevron-left" size={24} color="#dc2626" />
            </Pressable>

            {startPage > 1 && (
                <>
                    <PaginationButton
                        page={1}
                        currentPage={currentPage}
                        onPageChange={onPageChange}
                    />
                    {startPage > 2 && <Text className="text-gray-500 px-2">...</Text>}
                </>
            )}

            {pages.map((page) => (
                <PaginationButton
                    key={page}
                    page={page}
                    currentPage={currentPage}
                    onPageChange={onPageChange}
                />
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <Text className="text-gray-500 px-2">...</Text>}
                    <PaginationButton
                        page={totalPages}
                        currentPage={currentPage}
                        onPageChange={onPageChange}
                    />
                </>
            )}

            <Pressable
                onPress={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 ${currentPage === totalPages ? 'opacity-50' : ''}`}
            >
                <MaterialIcons name="chevron-right" size={24} color="#dc2626" />
            </Pressable>
        </View>
    );
}

function PaginationButton({
    page,
    currentPage,
    onPageChange
}: {
    page: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}) {
    const isActive = page === currentPage;

    return (
        <Pressable
            onPress={() => onPageChange(page)}
            className={`w-10 h-10 rounded-lg items-center justify-center ${isActive ? 'bg-red-600' : 'bg-black border border-red-900'
                }`}
        >
            <Text className={`font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {page}
            </Text>
        </Pressable>
    );
}
