import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  buildDefaultHomepageCmsContent,
  type HomepageCmsInput,
} from "@shared/homepage-cms";
import { Globe2, LayoutTemplate, Plus, Save, Star, Trash2 } from "lucide-react";

type HomepageCmsResponse = {
  content: HomepageCmsInput;
  storageMode: "database" | "memory";
  updatedAt?: string;
};

function ArrayEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, "New item"])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add item
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-start gap-2">
            <Textarea
              value={item}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
              className="min-h-[76px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminHomepageCmsStudio({
  adminPassword,
}: {
  adminPassword: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const defaults = useMemo(() => buildDefaultHomepageCmsContent(), []);
  const [form, setForm] = useState<HomepageCmsInput>(defaults);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/homepage-content"],
    queryFn: async (): Promise<HomepageCmsResponse> => {
      const response = await fetch("/api/admin/homepage-content", {
        headers: {
          "x-admin-password": adminPassword,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load homepage CMS content");
      }

      return response.json();
    },
    enabled: Boolean(adminPassword),
  });

  useEffect(() => {
    if (data?.content) {
      setForm(data.content);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: HomepageCmsInput) => {
      const response = await fetch("/api/admin/homepage-content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Failed to save homepage content");
      }

      return body as HomepageCmsResponse;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/admin/homepage-content"], result);
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-content"] });
      toast({
        title: "Homepage updated",
        description: "The public homepage content has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "We could not save the homepage CMS.",
        variant: "destructive",
      });
    },
  });

  const updateSection = <K extends keyof HomepageCmsInput>(
    key: K,
    value: HomepageCmsInput[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <Card className="mb-6 md:mb-8 overflow-hidden border-primary/20 shadow-lg">
      <div className="border-b border-primary/20 bg-gradient-to-r from-slate-50 via-white to-rose-50">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                Homepage CMS
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl text-slate-900">
                  Manage homepage content
                </CardTitle>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  The public homepage layout stays exactly as it is. This editor only
                  swaps the copy, lists, and CTA text that already exist on the page.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-slate-200 bg-white">
                <Globe2 className="mr-2 h-3.5 w-3.5" />
                Public homepage
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white">
                {data?.storageMode === "database" ? "Database-backed" : "Memory fallback"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </div>

      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="hero" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="social-proof">Social Proof</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
          </TabsList>

          <TabsContent value="hero" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Header and hero</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Header sign-in text</Label>
                    <Input
                      value={form.header.signInText}
                      onChange={(event) =>
                        updateSection("header", {
                          ...form.header,
                          signInText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Header trial button</Label>
                    <Input
                      value={form.header.trialButtonText}
                      onChange={(event) =>
                        updateSection("header", {
                          ...form.header,
                          trialButtonText: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hero headline</Label>
                  <Input
                    value={form.hero.headline}
                    onChange={(event) =>
                      updateSection("hero", {
                        ...form.hero,
                        headline: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hero highlighted text</Label>
                  <Input
                    value={form.hero.highlightedText}
                    onChange={(event) =>
                      updateSection("hero", {
                        ...form.hero,
                        highlightedText: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hero description</Label>
                  <Textarea
                    value={form.hero.description}
                    onChange={(event) =>
                      updateSection("hero", {
                        ...form.hero,
                        description: event.target.value,
                      })
                    }
                    className="min-h-[120px]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Primary CTA text</Label>
                    <Input
                      value={form.hero.primaryCtaText}
                      onChange={(event) =>
                        updateSection("hero", {
                          ...form.hero,
                          primaryCtaText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Demo CTA text</Label>
                    <Input
                      value={form.hero.demoCtaText}
                      onChange={(event) =>
                        updateSection("hero", {
                          ...form.hero,
                          demoCtaText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trial note</Label>
                    <Input
                      value={form.hero.trialNote}
                      onChange={(event) =>
                        updateSection("hero", {
                          ...form.hero,
                          trialNote: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CEO section and founder quote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>CEO section title</Label>
                  <Input
                    value={form.ceoSection.title}
                    onChange={(event) =>
                      updateSection("ceoSection", {
                        ...form.ceoSection,
                        title: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEO section subtitle</Label>
                  <Textarea
                    value={form.ceoSection.subtitle}
                    onChange={(event) =>
                      updateSection("ceoSection", {
                        ...form.ceoSection,
                        subtitle: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEO section highlight</Label>
                  <Input
                    value={form.ceoSection.introHighlight}
                    onChange={(event) =>
                      updateSection("ceoSection", {
                        ...form.ceoSection,
                        introHighlight: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Description line one</Label>
                    <Textarea
                      value={form.ceoSection.descriptionLineOne}
                      onChange={(event) =>
                        updateSection("ceoSection", {
                          ...form.ceoSection,
                          descriptionLineOne: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description line two</Label>
                    <Textarea
                      value={form.ceoSection.descriptionLineTwo}
                      onChange={(event) =>
                        updateSection("ceoSection", {
                          ...form.ceoSection,
                          descriptionLineTwo: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Founder quote paragraph one</Label>
                  <Textarea
                    value={form.founderQuote.paragraphOne}
                    onChange={(event) =>
                      updateSection("founderQuote", {
                        ...form.founderQuote,
                        paragraphOne: event.target.value,
                      })
                    }
                    className="min-h-[140px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Founder quote paragraph two</Label>
                  <Textarea
                    value={form.founderQuote.paragraphTwo}
                    onChange={(event) =>
                      updateSection("founderQuote", {
                        ...form.founderQuote,
                        paragraphTwo: event.target.value,
                      })
                    }
                    className="min-h-[140px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attribution</Label>
                  <Input
                    value={form.founderQuote.attribution}
                    onChange={(event) =>
                      updateSection("founderQuote", {
                        ...form.founderQuote,
                        attribution: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>App preview title</Label>
                    <Input
                      value={form.appPreview.title}
                      onChange={(event) =>
                        updateSection("appPreview", {
                          ...form.appPreview,
                          title: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>App preview subtitle</Label>
                    <Input
                      value={form.appPreview.subtitle}
                      onChange={(event) =>
                        updateSection("appPreview", {
                          ...form.appPreview,
                          subtitle: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Feature and support sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Features section title</Label>
                    <Input
                      value={form.featuresSection.title}
                      onChange={(event) =>
                        updateSection("featuresSection", {
                          ...form.featuresSection,
                          title: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Features section subtitle</Label>
                    <Input
                      value={form.featuresSection.subtitle}
                      onChange={(event) =>
                        updateSection("featuresSection", {
                          ...form.featuresSection,
                          subtitle: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Feature cards</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateSection("featuresSection", {
                          ...form.featuresSection,
                          items: [
                            ...form.featuresSection.items,
                            { title: "New feature", description: "Describe this feature." },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add feature
                    </Button>
                  </div>
                  {form.featuresSection.items.map((item, index) => (
                    <div key={`feature-${index}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateSection("featuresSection", {
                              ...form.featuresSection,
                              items: form.featuresSection.items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={item.title}
                            onChange={(event) => {
                              const next = [...form.featuresSection.items];
                              next[index] = { ...item, title: event.target.value };
                              updateSection("featuresSection", {
                                ...form.featuresSection,
                                items: next,
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={item.description}
                            onChange={(event) => {
                              const next = [...form.featuresSection.items];
                              next[index] = { ...item, description: event.target.value };
                              updateSection("featuresSection", {
                                ...form.featuresSection,
                                items: next,
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Support section title</Label>
                    <Input
                      value={form.supportSection.title}
                      onChange={(event) =>
                        updateSection("supportSection", {
                          ...form.supportSection,
                          title: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support intro title</Label>
                    <Input
                      value={form.supportSection.introTitle}
                      onChange={(event) =>
                        updateSection("supportSection", {
                          ...form.supportSection,
                          introTitle: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Support section subtitle</Label>
                  <Input
                    value={form.supportSection.subtitle}
                    onChange={(event) =>
                      updateSection("supportSection", {
                        ...form.supportSection,
                        subtitle: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Support cards</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateSection("supportSection", {
                          ...form.supportSection,
                          items: [
                            ...form.supportSection.items,
                            { title: "New support item", description: "Describe the support offered." },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add support item
                    </Button>
                  </div>
                  {form.supportSection.items.map((item, index) => (
                    <div key={`support-${index}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateSection("supportSection", {
                              ...form.supportSection,
                              items: form.supportSection.items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={item.title}
                            onChange={(event) => {
                              const next = [...form.supportSection.items];
                              next[index] = { ...item, title: event.target.value };
                              updateSection("supportSection", {
                                ...form.supportSection,
                                items: next,
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={item.description}
                            onChange={(event) => {
                              const next = [...form.supportSection.items];
                              next[index] = { ...item, description: event.target.value };
                              updateSection("supportSection", {
                                ...form.supportSection,
                                items: next,
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social-proof" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Testimonials and trust copy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Testimonials section title</Label>
                    <Input
                      value={form.testimonialsSection.title}
                      onChange={(event) =>
                        updateSection("testimonialsSection", {
                          ...form.testimonialsSection,
                          title: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rating text</Label>
                    <Input
                      value={form.testimonialsSection.ratingText}
                      onChange={(event) =>
                        updateSection("testimonialsSection", {
                          ...form.testimonialsSection,
                          ratingText: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Testimonials</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateSection("testimonialsSection", {
                          ...form.testimonialsSection,
                          items: [
                            ...form.testimonialsSection.items,
                            {
                              name: "New testimonial",
                              business: "Business type",
                              quote: "Add testimonial quote here.",
                              rating: 5,
                            },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add testimonial
                    </Button>
                  </div>
                  {form.testimonialsSection.items.map((item, index) => (
                    <div key={`testimonial-${index}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateSection("testimonialsSection", {
                              ...form.testimonialsSection,
                              items: form.testimonialsSection.items.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={item.name}
                            onChange={(event) => {
                              const next = [...form.testimonialsSection.items];
                              next[index] = { ...item, name: event.target.value };
                              updateSection("testimonialsSection", {
                                ...form.testimonialsSection,
                                items: next,
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Business</Label>
                          <Input
                            value={item.business}
                            onChange={(event) => {
                              const next = [...form.testimonialsSection.items];
                              next[index] = { ...item, business: event.target.value };
                              updateSection("testimonialsSection", {
                                ...form.testimonialsSection,
                                items: next,
                              });
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
                        <div className="space-y-2">
                          <Label>Quote</Label>
                          <Textarea
                            value={item.quote}
                            onChange={(event) => {
                              const next = [...form.testimonialsSection.items];
                              next[index] = { ...item, quote: event.target.value };
                              updateSection("testimonialsSection", {
                                ...form.testimonialsSection,
                                items: next,
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rating</Label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={item.rating}
                            onChange={(event) => {
                              const next = [...form.testimonialsSection.items];
                              next[index] = {
                                ...item,
                                rating: Number(event.target.value || 5),
                              };
                              updateSection("testimonialsSection", {
                                ...form.testimonialsSection,
                                items: next,
                              });
                            }}
                          />
                          <div className="flex gap-1 pt-2">
                            {[...Array(item.rating)].map((_, starIndex) => (
                              <Star
                                key={starIndex}
                                className="h-4 w-4 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing, benefits, and final CTA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pricing section title</Label>
                    <Input
                      value={form.pricingSection.title}
                      onChange={(event) =>
                        updateSection("pricingSection", {
                          ...form.pricingSection,
                          title: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pricing section subtitle</Label>
                    <Input
                      value={form.pricingSection.subtitle}
                      onChange={(event) =>
                        updateSection("pricingSection", {
                          ...form.pricingSection,
                          subtitle: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pricing badge text</Label>
                    <Input
                      value={form.pricingSection.badgeText}
                      onChange={(event) =>
                        updateSection("pricingSection", {
                          ...form.pricingSection,
                          badgeText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pricing card title</Label>
                    <Input
                      value={form.pricingSection.cardTitle}
                      onChange={(event) =>
                        updateSection("pricingSection", {
                          ...form.pricingSection,
                          cardTitle: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pricing description</Label>
                  <Textarea
                    value={form.pricingSection.description}
                    onChange={(event) =>
                      updateSection("pricingSection", {
                        ...form.pricingSection,
                        description: event.target.value,
                      })
                    }
                  />
                </div>

                <ArrayEditor
                  title="Pricing benefits"
                  items={form.pricingSection.benefits}
                  onChange={(items) =>
                    updateSection("pricingSection", {
                      ...form.pricingSection,
                      benefits: items,
                    })
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pricing CTA text</Label>
                    <Input
                      value={form.pricingSection.primaryCtaText}
                      onChange={(event) =>
                        updateSection("pricingSection", {
                          ...form.pricingSection,
                          primaryCtaText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pricing note</Label>
                    <Input
                      value={form.pricingSection.note}
                      onChange={(event) =>
                        updateSection("pricingSection", {
                          ...form.pricingSection,
                          note: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Experience section title</Label>
                  <Input
                    value={form.experienceSection.title}
                    onChange={(event) =>
                      updateSection("experienceSection", {
                        ...form.experienceSection,
                        title: event.target.value,
                      })
                    }
                  />
                </div>

                <ArrayEditor
                  title="Experience benefits"
                  items={form.experienceSection.benefits}
                  onChange={(items) =>
                    updateSection("experienceSection", {
                      ...form.experienceSection,
                      benefits: items,
                    })
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Experience CTA text</Label>
                    <Input
                      value={form.experienceSection.primaryCtaText}
                      onChange={(event) =>
                        updateSection("experienceSection", {
                          ...form.experienceSection,
                          primaryCtaText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Experience note</Label>
                    <Input
                      value={form.experienceSection.note}
                      onChange={(event) =>
                        updateSection("experienceSection", {
                          ...form.experienceSection,
                          note: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Final CTA title</Label>
                  <Input
                    value={form.finalCta.title}
                    onChange={(event) =>
                      updateSection("finalCta", {
                        ...form.finalCta,
                        title: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Final CTA subtitle</Label>
                  <Textarea
                    value={form.finalCta.subtitle}
                    onChange={(event) =>
                      updateSection("finalCta", {
                        ...form.finalCta,
                        subtitle: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Final CTA button text</Label>
                    <Input
                      value={form.finalCta.primaryCtaText}
                      onChange={(event) =>
                        updateSection("finalCta", {
                          ...form.finalCta,
                          primaryCtaText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Final CTA note</Label>
                    <Input
                      value={form.finalCta.note}
                      onChange={(event) =>
                        updateSection("finalCta", {
                          ...form.finalCta,
                          note: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="footer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Footer content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Brand title</Label>
                    <Input
                      value={form.footer.brandTitle}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          brandTitle: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Brand subtitle</Label>
                    <Input
                      value={form.footer.brandSubtitle}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          brandSubtitle: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={form.footer.description}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          description: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Company heading</Label>
                    <Input
                      value={form.footer.companyHeading}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          companyHeading: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>About Katie text</Label>
                    <Input
                      value={form.footer.aboutKatieText}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          aboutKatieText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>About Katie URL</Label>
                    <Input
                      value={form.footer.aboutKatieUrl}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          aboutKatieUrl: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Contact text</Label>
                    <Input
                      value={form.footer.contactText}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          contactText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact email</Label>
                    <Input
                      value={form.footer.contactEmail}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          contactEmail: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Privacy text</Label>
                    <Input
                      value={form.footer.privacyText}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          privacyText: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Get started heading</Label>
                    <Input
                      value={form.footer.getStartedHeading}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          getStartedHeading: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trial link text</Label>
                    <Input
                      value={form.footer.trialLinkText}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          trialLinkText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sign-in text</Label>
                    <Input
                      value={form.footer.signInText}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          signInText: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Copyright text</Label>
                    <Input
                      value={form.footer.copyrightText}
                      onChange={(event) =>
                        updateSection("footer", {
                          ...form.footer,
                          copyrightText: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {isLoading
              ? "Loading homepage CMS..."
              : `Layout is unchanged. Last saved ${data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "from defaults"}.`}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setForm(buildDefaultHomepageCmsContent())}>
              Load current default copy
            </Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save homepage content"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
