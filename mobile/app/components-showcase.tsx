import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import {
    Alert,
    Avatar,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Checkbox,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Input,
    Label,
    Pagination,
    RadioGroup,
    RadioGroupItem,
    Select,
    SelectOption,
    Separator,
    Switch,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Textarea,
} from '@/components/ui';
import { Button } from '@/components/ui/Button';

export default function ComponentShowcase() {
    const [checked, setChecked] = useState(false);
    const [switchOn, setSwitchOn] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [radioValue, setRadioValue] = useState('option1');
    const [selectValue, setSelectValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [inputValue, setInputValue] = useState('');
    const [textareaValue, setTextareaValue] = useState('');

    const selectOptions: SelectOption[] = [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
        { label: 'Option 3', value: 'opt3' },
        { label: 'Option 4', value: 'opt4' },
    ];

    return (
        <View className="flex-1 bg-gray-950">
            <Stack.Screen options={{ title: 'UI Components', headerShown: true }} />

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                {/* Header */}
                <Text className="text-3xl font-bold text-white mb-2">UI Components</Text>
                <Text className="text-gray-400 mb-6">Red & Black Theme for Mobile</Text>

                <Separator className="mb-6" />

                {/* Alerts */}
                <ComponentSection title="Alerts">
                    <Alert
                        variant="default"
                        title="Information"
                        description="This is a default alert message."
                    />
                    <Alert
                        variant="destructive"
                        title="Error"
                        description="Something went wrong!"
                    />
                    <Alert
                        variant="success"
                        title="Success"
                        description="Operation completed successfully."
                    />
                </ComponentSection>

                <Separator />

                {/* Avatars */}
                <ComponentSection title="Avatars">
                    <View className="flex-row gap-4 flex-wrap">
                        <Avatar fallback="JD" size="sm" />
                        <Avatar fallback="AB" size="md" />
                        <Avatar fallback="XY" size="lg" />
                        <Avatar fallback="QW" size="xl" />
                    </View>
                </ComponentSection>

                <Separator />

                {/* Badges */}
                <ComponentSection title="Badges">
                    <View className="flex-row gap-2 flex-wrap">
                        <Badge variant="default">Default</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                        <Badge variant="success">Success</Badge>
                        <Badge variant="outline">Outline</Badge>
                    </View>
                </ComponentSection>

                <Separator />

                {/* Cards */}
                <ComponentSection title="Cards">
                    <Card>
                        <CardHeader>
                            <CardTitle>Card Title</CardTitle>
                            <CardDescription>This is a card description</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Text className="text-gray-300">
                                Card content goes here. This is a beautiful card component with red and black theme.
                            </Text>
                        </CardContent>
                        <CardFooter>
                            <Button title="Action" onPress={() => { }} />
                        </CardFooter>
                    </Card>
                </ComponentSection>

                <Separator />

                {/* Form Controls */}
                <ComponentSection title="Form Controls">
                    <View className="gap-4">
                        <View>
                            <Label required>Email Address</Label>
                            <Input
                                placeholder="Enter your email"
                                value={inputValue}
                                onChangeText={setInputValue}
                                keyboardType="email-address"
                            />
                        </View>

                        <View>
                            <Label>Message</Label>
                            <Textarea
                                placeholder="Enter your message"
                                value={textareaValue}
                                onChangeText={setTextareaValue}
                            />
                        </View>

                        <Checkbox
                            checked={checked}
                            onCheckedChange={setChecked}
                            label="I agree to the terms and conditions"
                        />

                        <Switch
                            checked={switchOn}
                            onCheckedChange={setSwitchOn}
                            label="Enable notifications"
                        />
                    </View>
                </ComponentSection>

                <Separator />

                {/* Radio Group */}
                <ComponentSection title="Radio Group">
                    <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                        <RadioGroupItem value="option1" label="Option 1" />
                        <RadioGroupItem value="option2" label="Option 2" />
                        <RadioGroupItem value="option3" label="Option 3" />
                    </RadioGroup>
                </ComponentSection>

                <Separator />

                {/* Select */}
                <ComponentSection title="Select">
                    <Select
                        value={selectValue}
                        onValueChange={setSelectValue}
                        options={selectOptions}
                        placeholder="Choose an option"
                    />
                </ComponentSection>

                <Separator />

                {/* Dialog */}
                <ComponentSection title="Dialog">
                    <Button title="Open Dialog" onPress={() => setDialogOpen(true)} />

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Action</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to perform this action? This cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <View className="flex-row gap-2">
                                    <Pressable
                                        onPress={() => setDialogOpen(false)}
                                        className="bg-gray-700 px-4 py-2 rounded-lg"
                                    >
                                        <Text className="text-white">Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => setDialogOpen(false)}
                                        className="bg-red-600 px-4 py-2 rounded-lg"
                                    >
                                        <Text className="text-white">Confirm</Text>
                                    </Pressable>
                                </View>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </ComponentSection>

                <Separator />

                {/* Tabs */}
                <ComponentSection title="Tabs">
                    <Tabs defaultValue="tab1">
                        <TabsList>
                            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tab1">
                            <Text className="text-white">Content for Tab 1</Text>
                        </TabsContent>
                        <TabsContent value="tab2">
                            <Text className="text-white">Content for Tab 2</Text>
                        </TabsContent>
                        <TabsContent value="tab3">
                            <Text className="text-white">Content for Tab 3</Text>
                        </TabsContent>
                    </Tabs>
                </ComponentSection>

                <Separator />

                {/* Table */}
                <ComponentSection title="Table">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>John Doe</TableCell>
                                <TableCell>Admin</TableCell>
                                <TableCell>Active</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Jane Smith</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Active</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Bob Wilson</TableCell>
                                <TableCell>Manager</TableCell>
                                <TableCell>Inactive</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </ComponentSection>

                <Separator />

                {/* Pagination */}
                <ComponentSection title="Pagination">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={10}
                        onPageChange={setCurrentPage}
                    />
                    <Text className="text-center text-gray-400 mt-2">
                        Current Page: {currentPage}
                    </Text>
                </ComponentSection>

                <View className="h-8" />
            </ScrollView>
        </View>
    );
}

function ComponentSection({
    title,
    children
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-6">
            <Text className="text-xl font-bold text-red-600 mb-4">{title}</Text>
            <View className="gap-3">
                {children}
            </View>
        </View>
    );
}
